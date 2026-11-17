/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { sortedVersionNumbers } from './define_migration';
import {
  applyMappings,
  createIndex,
  indexExists,
  readVersion,
  stampVersion,
} from './backends/index_backend';
import type {
  MigrationDefinition,
  ReconcileOptions,
  ReconcileResult,
  MigrationVersion,
} from './types';

/**
 * Brings one resource, in one namespace, to the version the code expects.
 *
 * Asks "is it current?" rather than "is it missing?" - an existence check cannot tell a
 * new schema version from a deleted resource, which is why install-once never applies
 * changes on upgrade.
 *
 * Idempotent: re-running when installed already matches the target does nothing.
 */
export const reconcile = async ({
  definition,
  esClient,
  logger,
  namespace,
}: ReconcileOptions): Promise<ReconcileResult> => {
  const { id, resource, baseline, versions } = definition;
  const resourceName = resource.name(namespace);
  const declared = sortedVersionNumbers(versions);
  const target = declared.length > 0 ? declared[declared.length - 1] : baseline;

  const base: Omit<ReconcileResult, 'status' | 'installed' | 'target' | 'applied'> = {
    migrationId: id,
    resourceName,
    namespace,
  };

  if (!(await indexExists(esClient, resourceName))) {
    await createIndex(esClient, resourceName, mappingsAtVersion(definition, target), target);
    logger.info(`[${id}] created ${resourceName} at version ${target}`);
    return { ...base, status: 'created', installed: target, target, applied: [] };
  }

  const installed = (await readVersion(esClient, resourceName)) ?? baseline;

  if (installed >= target) {
    return { ...base, status: 'up_to_date', installed, target, applied: [] };
  }

  const applied: number[] = [];

  for (const version of declared.filter((candidate) => candidate > installed)) {
    const step = versions[version];
    try {
      await applyStep({ definition, step, version, esClient, logger, namespace, resourceName });
      applied.push(version);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[${id}] ${resourceName} failed applying version ${version}: ${message}`);
      // Stop at the last version that succeeded rather than skipping ahead, so the
      // resource is never stamped with changes it did not receive.
      return {
        ...base,
        status: 'failed',
        installed,
        target,
        applied,
        error: `version ${version}: ${message}`,
      };
    }
  }

  logger.info(`[${id}] ${resourceName} migrated ${installed} -> ${target}`);
  return { ...base, status: 'migrated', installed, target, applied };
};

interface ApplyStepArgs extends ReconcileOptions {
  step: MigrationVersion;
  version: number;
  resourceName: string;
}

const applyStep = async ({
  step,
  version,
  esClient,
  logger,
  namespace,
  resourceName,
}: ApplyStepArgs): Promise<void> => {
  if (step.change === 'additive') {
    await applyMappings(esClient, resourceName, step.mappings, version);
    return;
  }

  // The library declares and orders data steps; the plugin owns the body.
  await step.run({ esClient, logger, resourceName, namespace });
  await stampVersion(esClient, resourceName, version);
};

/**
 * The newest mappings at or below a version. Data versions carry none, so a resource
 * created from scratch takes the shape of the most recent additive step.
 */
const mappingsAtVersion = (
  definition: MigrationDefinition,
  version: number
): MappingTypeMapping => {
  const candidates = sortedVersionNumbers(definition.versions).filter(
    (candidate) => candidate <= version
  );

  for (const candidate of [...candidates].reverse()) {
    const step = definition.versions[candidate];
    if (step.change === 'additive') {
      return step.mappings;
    }
  }

  return {};
};
