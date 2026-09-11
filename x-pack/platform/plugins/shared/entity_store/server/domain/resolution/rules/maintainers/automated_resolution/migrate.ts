/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { Logger } from '@kbn/logging';
import { RESOLUTION_RULE_IDS } from '../../../../../../common/domain/resolution_rules/constants';
import {
  AUTOMATED_RESOLUTION_STATE_VERSION,
  type AutomatedResolutionState,
  type PerRuleLastRunStats,
  type PerRuleState,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

// The watermark is the one field fed back to Elasticsearch (as a range filter), so a
// malformed value is normalized to null (a full re-scan) rather than passed through.
const toWatermark = (value: unknown, logger: Logger): string | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  logger.warn(`Dropping malformed automated-resolution watermark: ${String(value)}`);
  return null;
};

const toLastRun = (value: unknown): PerRuleLastRunStats | null => {
  if (
    isRecord(value) &&
    typeof value.resolutionsCreated === 'number' &&
    typeof value.skippedAmbiguousBuckets === 'number'
  ) {
    return {
      resolutionsCreated: value.resolutionsCreated,
      skippedAmbiguousBuckets: value.skippedAmbiguousBuckets,
      skippedOversizedBuckets:
        typeof value.skippedOversizedBuckets === 'number' ? value.skippedOversizedBuckets : 0,
      skippedNoopBuckets:
        typeof value.skippedNoopBuckets === 'number' ? value.skippedNoopBuckets : 0,
      cascadeRetargeted: typeof value.cascadeRetargeted === 'number' ? value.cascadeRetargeted : 0,
      cascadesBlocked: typeof value.cascadesBlocked === 'number' ? value.cascadesBlocked : 0,
    };
  }
  return null;
};

const sanitizeLastRun = (value: unknown): PerRuleState['lastRun'] => {
  if (value == null) {
    return null;
  }
  const matcherStats = toLastRun(value);
  if (matcherStats) {
    return matcherStats;
  }
  // related_user (and future non-matcher rules) store a different lastRun
  // shape. Do not coerce those into matcher stats or drop them.
  if (isRecord(value) && !Object.hasOwn(value, 'resolutionsCreated')) {
    return value as PerRuleState['lastRun'];
  }
  return null;
};

const sanitizeRule = (value: unknown, logger: Logger): PerRuleState => {
  const record = isRecord(value) ? value : {};
  return {
    lastProcessedTimestamp: toWatermark(record.lastProcessedTimestamp, logger),
    lastRun: sanitizeLastRun(record.lastRun),
  };
};

const sanitizeRules = (value: unknown, logger: Logger): Record<string, PerRuleState> => {
  if (!isRecord(value)) {
    return {};
  }
  const rules: Record<string, PerRuleState> = {};
  for (const [id, rule] of Object.entries(value)) {
    rules[id] = sanitizeRule(rule, logger);
  }
  return rules;
};

/**
 * Reshapes the persisted automated-resolution task state into the per-rule map.
 * Runs every cycle, so it must never throw and must be idempotent.
 *
 * In practice there are three real inputs:
 *  - the current `{ version, rules }` shape — passed through when version is current,
 *    which also preserves rule ids this version may not know yet;
 *  - `{ rules }` without `version` — email watermark is reset so case-insensitive
 *    matching can heal pre-existing case-split groups (one-time);
 *  - the original flat `{ lastProcessedTimestamp, lastRun }` — moved into
 *    `rules[email_exact_match]`, then the same email reset applies.
 *
 * Anything else (empty / null / garbage) yields an empty map; a rule with no entry
 * backfills on its first run.
 *
 * If a newer Kibana stored `version` above this binary's current version, leave
 * that marker alone. Writing CURRENT over it would re-run the newer node's
 * one-time work when it wakes up. A mixed window can still re-fire *this*
 * version's email reset if an older node drops `version`; that is an extra
 * email rescan, not data loss. Do not hide a sentinel inside `rules` — that
 * map's contract is unknown rule ids pass through.
 */
export function migrate(input: unknown, logger: Logger): AutomatedResolutionState {
  const source = isRecord(input) ? input : {};
  const storedVersion = typeof source.version === 'number' ? source.version : 0;

  if (storedVersion > AUTOMATED_RESOLUTION_STATE_VERSION) {
    const rules = isRecord(source.rules) ? (source.rules as Record<string, PerRuleState>) : {};
    return { version: storedVersion, rules };
  }

  const rules = sanitizeRules(source.rules, logger);
  const emailRuleId = RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH;

  // Move the legacy flat state into the email rule slot — unless it was already
  // migrated, in which case keep the newer progress (idempotent / crash-retry safe).
  const hasLegacyState =
    Object.hasOwn(source, 'lastProcessedTimestamp') || Object.hasOwn(source, 'lastRun');
  if (hasLegacyState && !Object.hasOwn(rules, emailRuleId)) {
    rules[emailRuleId] = {
      lastProcessedTimestamp: toWatermark(source.lastProcessedTimestamp, logger),
      lastRun: toLastRun(source.lastRun),
    };
  }

  if (storedVersion < AUTOMATED_RESOLUTION_STATE_VERSION && Object.hasOwn(rules, emailRuleId)) {
    const emailState = rules[emailRuleId];
    rules[emailRuleId] = {
      lastProcessedTimestamp: null,
      lastRun: sanitizeLastRun(emailState.lastRun),
    };
  }

  return { version: AUTOMATED_RESOLUTION_STATE_VERSION, rules };
}
