/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../../../../tasks/entity_maintainers/types';

export const AUTOMATED_RESOLUTION_STATE_VERSION = 3;

export interface PerRuleLastRunStats extends EntityMaintainerState {
  resolutionsCreated: number;
  skippedAmbiguousBuckets: number;
  skippedOversizedBuckets: number;
  skippedNoopBuckets: number;
  cascadeRetargeted: number;
  cascadesBlocked: number;
}

export interface PerRuleState extends EntityMaintainerState {
  lastProcessedTimestamp: string | null;
  lastRun: EntityMaintainerState | null;
}

export const EMPTY_RULE_STATE: PerRuleState = { lastProcessedTimestamp: null, lastRun: null };

// A subtype because the state's index signature can't hold optional fields.
export interface CustomRuleState extends PerRuleState {
  /** Hash of the definition the watermark belongs to; a change rescans. */
  definitionFingerprint: string;
  /** For people reading the state; nothing orders on it. */
  lastAttemptAt: string;
  /** The last run in which this rule went first; rotates deferred rules. */
  lastStartedFirstAt: string | null;
  deferredByDeadline: boolean;
  /** Why the last attempt failed; null after a run that didn't fail. */
  lastError: string | null;
}

// `rules` is an open map keyed by rule id rather than a fixed set: a rule with no
// entry backfills (null watermark → full scan) on its first run, so new rules can be
// added without a state migration, and watermarks for rules this version doesn't know
// (e.g. written by a newer node during a rolling upgrade) pass through untouched,
// except `custom:<id>` entries, which are removed once their rule no longer exists.
//
// `version` tracks one-time upgrades of this state blob (see migrate.ts):
//   2 — reset email watermark
//   3 — reset SID watermarks (windows + CrowdStrike)
export interface AutomatedResolutionState extends EntityMaintainerState {
  version: number;
  rules: Record<string, PerRuleState>;
}
