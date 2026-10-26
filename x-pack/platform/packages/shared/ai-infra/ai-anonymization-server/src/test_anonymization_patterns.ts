/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { anonymizeRecords } from './anonymize_records';
import { applyStringReplacements, flattenJsonStrings } from './flatten_json';
import type { RegexWorkerService } from './regex_worker_service';

export interface PatternTestBreakdownEntry {
  entityType: string;
  originalValue: string;
  mask: string;
  occurrences: number;
}

export interface PatternTestResult<T = unknown> {
  maskedInput: T;
  anonymizations: PatternTestBreakdownEntry[];
  stats: {
    valuesMasked: number;
    uniqueValues: number;
    rulesApplied: number;
  };
}

/**
 * Runs caller-supplied regex rules against caller-supplied sample input using the same
 * detection/masking code the real `chatComplete` pipeline uses, without persisting anything.
 * Backs the Anonymization Settings page's "Pattern tester". NER rules are not supported.
 *
 * Throws when a rule cannot be applied (e.g. a pattern that does not compile or exceeds the
 * worker timeout), so callers can report the problem instead of a misleading "0 masked".
 */
export async function testAnonymizationPatterns<T = unknown>({
  input,
  rules,
  regexWorker,
  esClient,
  logger,
}: {
  input: T;
  rules: RegexAnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  logger?: Logger;
}): Promise<PatternTestResult<T>> {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const flattened = flattenJsonStrings(input);

  const { records, anonymizations } = await anonymizeRecords({
    input: [flattened],
    anonymizationRules: enabledRules,
    regexWorker,
    esClient,
    logger,
  });

  const maskedInput = applyStringReplacements(input, records[0] ?? {});

  const breakdownByKey = new Map<string, PatternTestBreakdownEntry>();
  anonymizations.forEach(({ entity }) => {
    const key = `${entity.class_name}\u0000${entity.value}\u0000${entity.mask}`;
    const existing = breakdownByKey.get(key);
    if (existing) {
      existing.occurrences += 1;
    } else {
      breakdownByKey.set(key, {
        entityType: entity.class_name,
        originalValue: entity.value,
        mask: entity.mask,
        occurrences: 1,
      });
    }
  });

  const breakdown = [...breakdownByKey.values()];

  return {
    maskedInput,
    anonymizations: breakdown,
    stats: {
      valuesMasked: anonymizations.length,
      uniqueValues: breakdown.length,
      rulesApplied: enabledRules.length,
    },
  };
}
