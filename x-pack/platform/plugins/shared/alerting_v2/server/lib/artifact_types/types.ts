/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

/**
 * Declarative descriptor: a top-level key in artifact `data` holds a saved-object id.
 */
export interface ArtifactReferenceDescriptor {
  /** Top-level key in `data` holding the id, e.g. `dashboardId`. Must not contain `:`. */
  field: string;
  /** Saved-object type the id points to, e.g. `dashboard`. */
  savedObjectType: string;
}

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
  /**
   * Declarative reference extraction. Each descriptor names a field in `data`
   * that holds a saved-object id and the SO type it points to.
   */
  references?: ArtifactReferenceDescriptor[];
}

/**
 * Minimal artifact shape used by validation and reference helpers.
 */
export interface RuleArtifactLike {
  id: string;
  type: string;
  data: Record<string, unknown>;
}
