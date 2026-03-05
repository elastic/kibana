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
import { unescapePointerToken, type AnonymizationState } from './types';
import { executeRegexRules } from './execute_regex_rules';
import { executeNerRule } from './execute_ner_rule';
import type { RegexWorkerService } from './regex_worker_service';
import { resolveOverlapsAndMask } from './resolve_overlaps_and_mask';
import { getEntityMask } from './get_entity_mask';

const ROOT_FIELDS_TO_STRIP = ['content', 'response', 'system', 'toolCalls'] as const;

const shouldIgnoreNerModelError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('The NER model') &&
    (message.includes('was not found') || message.includes('is not deployed'))
  );
};

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

const parseEntityClassFromToken = (token: string): string => {
  const parts = token.split('_');
  if (parts.length <= 1) {
    return 'ENTITY_NAME';
  }

  return parts.slice(0, -1).join('_');
};

const applyKnownReplacements = ({
  state,
  knownReplacements,
}: {
  state: AnonymizationState;
  knownReplacements?: Array<{ anonymized: string; original: string }>;
}): AnonymizationState => {
  if (!knownReplacements?.length) {
    return state;
  }

  const orderedReplacements = [...knownReplacements].sort(
    (left, right) => right.original.length - left.original.length
  );
  const records = state.records.map((record) => ({ ...record }));
  const appliedTokens = new Set<string>();

  records.forEach((record) => {
    Object.entries(record).forEach(([recordKey, value]) => {
      if (typeof value !== 'string' || value.length === 0) {
        return;
      }

      let next = value;
      for (const replacement of orderedReplacements) {
        if (
          replacement.original &&
          replacement.original !== replacement.anonymized &&
          next.includes(replacement.original)
        ) {
          appliedTokens.add(replacement.anonymized);
          next = next.split(replacement.original).join(replacement.anonymized);
        }
      }

      record[recordKey] = next;
    });
  });

  const replacementsByToken = new Map(
    knownReplacements.map((replacement) => [replacement.anonymized, replacement])
  );

  const replacementAnonymizations = [...appliedTokens]
    .map((token) => replacementsByToken.get(token))
    .filter((replacement): replacement is { anonymized: string; original: string } =>
      Boolean(replacement)
    )
    .map((replacement) => ({
      rule: { type: 'ReplacementMemory' },
      entity: {
        class_name: parseEntityClassFromToken(replacement.anonymized),
        value: replacement.original,
        mask: replacement.anonymized,
      },
    }));

  return {
    records,
    anonymizations: [...state.anonymizations, ...replacementAnonymizations],
  };
};

export async function anonymizeRecords<T extends Record<string, string | undefined>>({
  input,
  anonymizationRules,
  regexWorker,
  esClient,
  salt,
  effectivePolicy,
  knownReplacements,
}: {
  input: T[];
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  salt?: string;
  effectivePolicy?: EffectivePolicy;
  knownReplacements?: Array<{ anonymized: string; original: string }>;
}): Promise<AnonymizationState>;

export async function anonymizeRecords({
  input,
  anonymizationRules,
  regexWorker,
  esClient,
  salt,
  effectivePolicy,
  knownReplacements,
}: {
  input: Array<Record<string, string>>;
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  salt?: string;
  effectivePolicy?: EffectivePolicy;
  knownReplacements?: Array<{ anonymized: string; original: string }>;
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

  state = applyKnownReplacements({
    state,
    knownReplacements,
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
    try {
      state = await executeNerRule({
        state,
        rule: nerRule,
        esClient,
        salt,
      });
    } catch (error) {
      if (!shouldIgnoreNerModelError(error)) {
        throw error;
      }
    }
  }

  return state;
}
