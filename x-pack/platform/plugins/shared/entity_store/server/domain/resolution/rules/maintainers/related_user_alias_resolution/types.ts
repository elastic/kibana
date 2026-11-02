/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TargetSelectionEntity } from '../../..';

export const SEED_IDENTITY_PREFILTER_FIELDS = ['user.id', 'user.email', 'user.name'] as const;

export interface RelatedUserAliasResolutionLastRun {
  /**
   * v1 intentionally re-scans all unresolved IDP seeds each enabled cycle. These
   * counters are observability only; no per-seed cursor is persisted yet.
   */
  seedsScanned: number;
  linksCreated: number;
  cascadeRetargeted: number;
  skippedAmbiguous: number;
  cascadesBlocked: number;
  failedGroups: number;
}

export interface SeedEntity extends TargetSelectionEntity {
  source: Record<string, unknown>;
}

export interface CandidateEntity extends TargetSelectionEntity {
  source: Record<string, unknown>;
}

export interface RelatedUserBundle {
  relatedUsers: string[];
  excludedValues: string[];
}
