/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationDefinition } from './types';

/**
 * Declares how a resource's shape evolves. Validation happens here, at module load,
 * so a malformed definition fails on startup rather than mid-migration.
 */
export const defineMigration = (definition: MigrationDefinition): MigrationDefinition => {
  const { id, baseline, versions } = definition;

  if (!id.trim()) {
    throw new Error('es-index-migration: `id` must be a non-empty string');
  }

  if (!Number.isInteger(baseline) || baseline < 1) {
    throw new Error(`es-index-migration [${id}]: \`baseline\` must be a positive integer`);
  }

  const declared = sortedVersionNumbers(versions);

  if (declared.some((version) => !Number.isInteger(version) || version < 1)) {
    throw new Error(`es-index-migration [${id}]: version keys must be positive integers`);
  }

  // A gap would silently skip a step, leaving the resource stamped at a version
  // whose changes were never applied.
  declared.forEach((version, index) => {
    if (index > 0 && version !== declared[index - 1] + 1) {
      throw new Error(
        `es-index-migration [${id}]: versions must be consecutive, found a gap between ${
          declared[index - 1]
        } and ${version}`
      );
    }
  });

  return definition;
};

/** Version keys in ascending order. Object keys are strings, so they need coercing first. */
export const sortedVersionNumbers = (versions: MigrationDefinition['versions']): number[] =>
  Object.keys(versions)
    .map(Number)
    .sort((a, b) => a - b);
