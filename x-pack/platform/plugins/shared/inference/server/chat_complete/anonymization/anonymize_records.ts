/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { AnonymizationRule, RegexAnonymizationRule } from '@kbn/inference-common';
import { partition } from 'lodash';
import { AnonymizationState } from './types';
import { executeRegexRule } from './execute_regex_rule';
import { executeNerRule } from './execute_ner_rule';

export async function anonymizeRecords<T extends Record<string, string | undefined>>({
  input,
  anonymizationRules,
  esClient,
}: {
  input: T[];
  anonymizationRules: AnonymizationRule[];
  esClient: ElasticsearchClient;
}): Promise<AnonymizationState>;

export async function anonymizeRecords({
  input,
  anonymizationRules,
  esClient,
}: {
  input: Array<Record<string, string>>;
  anonymizationRules: AnonymizationRule[];
  esClient: ElasticsearchClient;
}): Promise<AnonymizationState> {
  let state: AnonymizationState = {
    records: input.concat(),
    anonymizations: [],
  };

  const [regexRules, nerRules] = partition(
    anonymizationRules,
    (rule): rule is RegexAnonymizationRule => rule.type === 'RegExp'
  );

  for (const rule of regexRules) {
    state = executeRegexRule({
      rule,
      state,
    });
  }

  if (!nerRules.length) {
    return state;
  }

  for (const nerRule of nerRules) {
    state = await executeNerRule({
      state,
      rule: nerRule,
      esClient,
    });
  }

  return state;
}
