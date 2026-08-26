/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../../../../tasks/entity_maintainers/types';

export const AUTOMATED_RESOLUTION_STATE_VERSION = 2;

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

// `rules` is an open map keyed by rule id rather than a fixed set: a rule with no
// entry backfills (null watermark → full scan) on its first run, so new rules can be
// added without a state migration, and watermarks for rules this version doesn't know
// (e.g. written by a newer node during a rolling upgrade) pass through untouched.
//
// `version` tracks one-time upgrades of this state blob (currently: reset the email
// rule watermark so case-insensitive matching can heal pre-existing case-split groups).
export interface AutomatedResolutionState extends EntityMaintainerState {
  version: number;
  rules: Record<string, PerRuleState>;
}
