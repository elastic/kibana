/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

/**
 * Pure-data definition supplied by the owning plugin via `registerArtifactType`.
 */
export interface ArtifactTypeDefinition {
  /**
   * Namespaced type id. MUST equal the artifact envelope's `type`
   * (e.g. `runbook`, `siem.dashboard`). NOT a saved-object type.
   */
  type: string;
  /**
   * Validates the artifact's `data` object. Must be fully bounded (every string
   * `.max()`, every array `.max()`, objects `.strict()`, no `z.any()` /
   * `z.unknown()`). Enforced at registration.
   */
  dataSchema: z.ZodType<Record<string, unknown>>;
}

/**
 * Minimal artifact shape used by validation and reference helpers.
 */
export interface RuleArtifactLike {
  id: string;
  type: string;
  data: Record<string, unknown>;
}
