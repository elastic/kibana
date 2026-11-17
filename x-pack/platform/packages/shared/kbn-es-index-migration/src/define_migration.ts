/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { describeViolations, verifyAdditive } from './verify';
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

  verifyDeclaredVersions(definition, declared);

  return definition;
};

/**
 * Checks every `additive` step against the mappings that preceded it.
 *
 * Runs here rather than during the migration so a mistake fails at startup, on a
 * developer's machine, instead of part-way through a customer's upgrade with an index
 * already stamped at an intermediate version.
 */
const verifyDeclaredVersions = (definition: MigrationDefinition, declared: number[]): void => {
  const backing = definition.resource.backing ?? 'concrete_index';
  let previous: MappingTypeMapping | undefined;

  for (const version of declared) {
    const step = definition.versions[version];

    if (step.change !== 'additive') {
      // A data step changes documents, not shape, so the baseline for the next
      // comparison is whatever the last additive step declared.
      continue;
    }

    if (previous !== undefined) {
      const result = verifyAdditive(previous, step.mappings, backing);
      if (!result.ok) {
        throw new Error(describeViolations(definition.id, version, result));
      }
    }

    previous = step.mappings;
  }
};

/** Version keys in ascending order. Object keys are strings, so they need coercing first. */
export const sortedVersionNumbers = (versions: MigrationDefinition['versions']): number[] =>
  Object.keys(versions)
    .map(Number)
    .sort((a, b) => a - b);
