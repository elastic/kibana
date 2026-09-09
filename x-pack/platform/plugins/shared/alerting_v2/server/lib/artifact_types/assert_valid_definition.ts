/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactTypeDefinition } from './types';

/**
 * Structural sanity checks for an artifact type definition. Throws so a
 * misconfigured solution fails at plugin setup rather than at request time.
 */
export function assertValidDefinition(def: ArtifactTypeDefinition): void {
  if (typeof def.type !== 'string' || def.type.trim().length === 0) {
    throw new Error('Artifact type definition requires a non-empty type');
  }

  if (def.dataSchema == null) {
    throw new Error(`Artifact type "${def.type}" requires a dataSchema`);
  }
}
