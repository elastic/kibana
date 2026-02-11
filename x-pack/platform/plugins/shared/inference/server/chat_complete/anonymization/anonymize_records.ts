/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationRule, RegexAnonymizationRule } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import { partition } from 'lodash';
import type { AnonymizationState } from './types';
import { executeRegexRules } from './execute_regex_rules';
import { executeNerRule } from './execute_ner_rule';
import type { RegexWorkerService } from './regex_worker_service';
import { resolveOverlapsAndMask } from './resolve_overlaps_and_mask';
import { getEntityMask } from './get_entity_mask';

const ROOT_FIELDS_TO_STRIP = ['content', 'response', 'system', 'toolCalls'] as const;

const unescapePointerToken = (token: string): string => token.replace(/~1/g, '/').replace(/~0/g, '~');

const pointerToDotPath = (pointer: string): string => {
  const normalized = pointer.startsWith('/') ? pointer.slice(1) : pointer;
  if (!normalized) {
    return '';
  }

  return normalized
    .split('/')
    .map((token) => unescapePointerToken(token))
    .join('.');
};

const resolvePolicyForPointer = (
  recordKey: string,
  effectivePolicy: EffectivePolicy
): { fieldPath: string; policy: EffectivePolicy[string] } | undefined => {
  const dotPath = pointerToDotPath(recordKey);
  const candidates = new Set<string>([
    recordKey,
    recordKey.startsWith('/') ? recordKey.slice(1) : recordKey,
    dotPath,
  ]);

  if (dotPath) {
    const segments = dotPath.split('.');
    if (segments.length > 1) {
      const [first] = segments;
      if (ROOT_FIELDS_TO_STRIP.includes(first as (typeof ROOT_FIELDS_TO_STRIP)[number])) {
        candidates.add(segments.slice(1).join('.'));
      }
    }
  }

  for (const candidate of candidates) {
    if (candidate && effectivePolicy[candidate]) {
      return { fieldPath: candidate, policy: effectivePolicy[candidate] };
    }
  }
};

const applyFieldPolicy = ({
  state,
  effectivePolicy,
  salt,
}: {
  state: AnonymizationState;
  effectivePolicy?: EffectivePolicy;
  salt?: string;
}): AnonymizationState => {
  if (!effectivePolicy || !Object.keys(effectivePolicy).length) {
    return state;
  }

  const records = state.records.map((record) => ({ ...record }));
  const anonymizations = [...state.anonymizations];

  records.forEach((record) => {
    Object.entries(record).forEach(([recordKey, value]) => {
      if (typeof value !== 'string' || value.length === 0) {
        return;
      }

      const resolvedPolicy = resolvePolicyForPointer(recordKey, effectivePolicy);
      if (!resolvedPolicy) {
        return;
      }

      const { fieldPath, policy } = resolvedPolicy;
      if (policy.action === 'allow') {
        return;
      }

      if (policy.action === 'deny') {
        record[recordKey] = '';
        return;
      }

      const mask = getEntityMask(
        {
          class_name: policy.entityClass,
          value,
          field: fieldPath,
        },
        salt
      );

      record[recordKey] = mask;
      anonymizations.push({
        rule: { type: 'FieldPolicy' },
        entity: {
          class_name: policy.entityClass,
          value,
          mask,
        },
      });
    });
  });

  return {
    records,
    anonymizations,
  };
};

export async function anonymizeRecords<T extends Record<string, string | undefined>>({
  input,
  anonymizationRules,
  regexWorker,
  esClient,
  salt,
  effectivePolicy,
}: {
  input: T[];
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  salt?: string;
  effectivePolicy?: EffectivePolicy;
}): Promise<AnonymizationState>;

export async function anonymizeRecords({
  input,
  anonymizationRules,
  regexWorker,
  esClient,
  salt,
  effectivePolicy,
}: {
  input: Array<Record<string, string>>;
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  salt?: string;
  effectivePolicy?: EffectivePolicy;
}): Promise<AnonymizationState> {
  let state: AnonymizationState = {
    records: input.concat(),
    anonymizations: [],
  };

  state = applyFieldPolicy({
    state,
    effectivePolicy,
    salt,
  });

  const [regexRules, nerRules] = partition(
    anonymizationRules,
    (rule): rule is RegexAnonymizationRule => rule.type === 'RegExp'
  );

  const detectedRegexEntities = await executeRegexRules({
    records: state.records,
    rules: regexRules,
    regexWorker,
  });

  // Process detected regex matches to resolve overlaps and apply masks
  state = resolveOverlapsAndMask({
    detectedMatches: detectedRegexEntities,
    state,
    rules: regexRules,
    salt,
  });

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
