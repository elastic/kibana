/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactTypeDefinition } from './types';

const SAFE_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

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

  if (def.references === undefined) {
    return;
  }

  if (!Array.isArray(def.references)) {
    throw new Error(`Artifact type "${def.type}" references must be an array`);
  }

  const seenFields = new Set<string>();
  for (const descriptor of def.references) {
    if (typeof descriptor.field !== 'string' || descriptor.field.trim().length === 0) {
      throw new Error(
        `Artifact type "${def.type}" references require a non-empty field identifier`
      );
    }
    if (!SAFE_FIELD_PATTERN.test(descriptor.field)) {
      throw new Error(
        `Artifact type "${def.type}" reference field "${descriptor.field}" must match ${SAFE_FIELD_PATTERN}`
      );
    }
    if (seenFields.has(descriptor.field)) {
      throw new Error(
        `Artifact type "${def.type}" declares duplicate reference field "${descriptor.field}"`
      );
    }
    seenFields.add(descriptor.field);

    if (
      typeof descriptor.savedObjectType !== 'string' ||
      descriptor.savedObjectType.trim().length === 0
    ) {
      throw new Error(
        `Artifact type "${def.type}" reference field "${descriptor.field}" requires a non-empty savedObjectType`
      );
    }
  }
}
