/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AnonymizationFailureMode,
  AnonymizationRule,
  RegexAnonymizationRule,
} from '@kbn/ai-anonymization-common';
import { partition } from 'lodash';
import type { AnonymizationState, DetectedMatch } from './types';
import { executeRegexRules } from './execute_regex_rules';
import { compileRulePattern, usesNativeFallback } from './execute_regex_rule_task';
import { executeNerRule } from './execute_ner_rule';
import type { RegexWorkerService } from './regex_worker_service';
import { resolveOverlapsAndMask } from './resolve_overlaps_and_mask';

const shouldIgnoreNerModelError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('The NER model') &&
    (message.includes('was not found') || message.includes('is not deployed'))
  );
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

// A rule that only the legacy regex engine can run is reported once, not on every request.
const WARNED_LEGACY_RULES_LIMIT = 200;
const warnedLegacyRules = new Set<string>();

const warnOnceAboutLegacyRule = (rule: RegexAnonymizationRule, logger?: Logger) => {
  const key = `${rule.id ?? ''}\u0000${rule.pattern}`;
  if (!logger || warnedLegacyRules.has(key)) {
    return;
  }
  if (warnedLegacyRules.size >= WARNED_LEGACY_RULES_LIMIT) {
    warnedLegacyRules.clear();
  }
  warnedLegacyRules.add(key);
  logger.warn(
    `Anonymization rule "${
      rule.name ?? rule.id ?? rule.entityClass
    }" uses syntax that only the legacy regex engine supports, so it runs in a worker task of its own without the linear-time guarantee. Rewrite it in RE2 syntax (no lookahead, lookbehind, backreferences or \\uXXXX escapes).`
  );
};

export async function anonymizeRecords<T extends Record<string, string | undefined>>({
  input,
  anonymizationRules,
  regexWorker,
  esClient,
  salt,
  knownReplacements,
  onFailure,
  logger,
}: {
  input: T[];
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  salt?: string;
  knownReplacements?: Array<{ anonymized: string; original: string }>;
  onFailure?: AnonymizationFailureMode;
  logger?: Logger;
}): Promise<AnonymizationState>;

export async function anonymizeRecords({
  input,
  anonymizationRules,
  regexWorker,
  esClient,
  salt,
  knownReplacements,
  onFailure,
  logger,
}: {
  input: Array<Record<string, string>>;
  anonymizationRules: AnonymizationRule[];
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  salt?: string;
  knownReplacements?: Array<{ anonymized: string; original: string }>;
  onFailure?: AnonymizationFailureMode;
  logger?: Logger;
}): Promise<AnonymizationState> {
  let state: AnonymizationState = {
    records: input.concat(),
    anonymizations: [],
  };

  state = applyKnownReplacements({
    state,
    knownReplacements,
  });

  const [declaredRegexRules, nerRules] = partition(
    anonymizationRules,
    (rule): rule is RegexAnonymizationRule => rule.type === 'RegExp'
  );

  // Under allow_unsafe, a rule that cannot compile is skipped on its own so it cannot disable the
  // valid rules next to it. Under block it stays in, and the call fails with the compile error.
  const regexRules =
    onFailure === 'allow_unsafe'
      ? declaredRegexRules.filter((rule) => {
          try {
            compileRulePattern(rule);
            return true;
          } catch (error) {
            logger?.warn(
              `Skipping regex rule; proceeding without it because onFailure is "allow_unsafe": ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            return false;
          }
        })
      : declaredRegexRules;

  // Rules that only the legacy engine can run have no linear-time guarantee. They run in a worker
  // task of their own so that one stalling cannot discard the matches of the other rules; rule
  // indexes are kept so overlap precedence follows the configured order.
  const safeRuleIndexes: number[] = [];
  const legacyRuleIndexes: number[] = [];
  regexRules.forEach((rule, index) => {
    if (usesNativeFallback(rule)) {
      warnOnceAboutLegacyRule(rule, logger);
      legacyRuleIndexes.push(index);
    } else {
      safeRuleIndexes.push(index);
    }
  });

  const detectMatches = async (ruleIndexes: number[]): Promise<DetectedMatch[]> => {
    if (!ruleIndexes.length) {
      return [];
    }
    const matches = await executeRegexRules({
      records: state.records,
      rules: ruleIndexes.map((index) => regexRules[index]),
      regexWorker,
    });
    return matches.map((match) => ({ ...match, ruleIndex: ruleIndexes[match.ruleIndex] }));
  };

  try {
    let detectedMatches: DetectedMatch[];
    if (onFailure === 'allow_unsafe') {
      const [safeResult, legacyResult] = await Promise.allSettled([
        detectMatches(safeRuleIndexes),
        detectMatches(legacyRuleIndexes),
      ]);
      const describeFailure = (reason: unknown) =>
        reason instanceof Error ? reason.message : String(reason);
      if (safeResult.status === 'rejected') {
        // allow_unsafe: proceed without masking the entities regex detection would have found,
        // rather than failing the chatComplete call.
        logger?.warn(
          `Regex anonymization failed; proceeding unmasked because onFailure is "allow_unsafe": ${describeFailure(
            safeResult.reason
          )}`
        );
      }
      if (legacyResult.status === 'rejected') {
        logger?.warn(
          `Regex rules that only the legacy engine supports failed; skipping them because onFailure is "allow_unsafe": ${describeFailure(
            legacyResult.reason
          )}`
        );
      }
      detectedMatches = [
        ...(safeResult.status === 'fulfilled' ? safeResult.value : []),
        ...(legacyResult.status === 'fulfilled' ? legacyResult.value : []),
      ];
    } else {
      // Either failure fails the request, so do not hold the error back until a slow legacy task
      // has also finished.
      const [safeMatches, legacyMatches] = await Promise.all([
        detectMatches(safeRuleIndexes),
        detectMatches(legacyRuleIndexes),
      ]);
      detectedMatches = [...safeMatches, ...legacyMatches];
    }

    // Process detected regex matches to resolve overlaps and apply masks
    state = resolveOverlapsAndMask({
      detectedMatches,
      state,
      rules: regexRules,
      salt,
    });
  } catch (error) {
    if (onFailure !== 'allow_unsafe') {
      throw error;
    }
    logger?.warn(
      `Applying the regex matches failed; proceeding unmasked because onFailure is "allow_unsafe": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

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
      // A missing or undeployed model is the one NER failure that does not fail the request, so
      // leave a trace: the entities this rule would have masked are sent as-is.
      logger?.warn(
        `Skipping NER anonymization rule (model: ${
          nerRule.modelId ?? 'default'
        }) because the model is not available; text it would have masked is not masked. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return state;
}
