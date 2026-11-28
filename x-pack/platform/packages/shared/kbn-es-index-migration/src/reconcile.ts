/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { sortedVersionNumbers } from './define_migration';
import { classifyEsError, describeEsRefusal } from './es_errors';
import { resolveName } from './resource';
import { recordDrift, recordRun } from './metrics';
import { verifyAdditive } from './verify';
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
 * Reconciles already running in this process, keyed by migration and namespace.
 *
 * Applying the same additive mappings twice is harmless, but a data step is the plugin's
 * own code and may not be idempotent, so two overlapping runs could execute a backfill
 * twice. Callers that overlap share one run and one result instead.
 *
 * In-process only. Across nodes, `auto` is covered by Task Manager's claim; `lifecycle`
 * and `triggered` are driven by their caller, so avoiding a concurrent run there is the
 * caller's responsibility.
 */
const inFlight = new Map<string, Promise<ReconcileResult>>();

/**
 * Brings one resource, in one namespace, to the version the code expects.
 *
 * Asks "is it current?" rather than "is it missing?" - an existence check cannot tell a
 * new schema version from a deleted resource, which is why install-once never applies
 * changes on upgrade.
 *
 * Idempotent: re-running when installed already matches the target does nothing.
 */
export const reconcile = async (options: ReconcileOptions): Promise<ReconcileResult> => {
  // Keyed on the resolved resource, not the namespace, so a global index shared by every
  // space is guarded as the single resource it is.
  const key = `${options.definition.id}:${resolveName(
    options.definition.resource,
    options.namespace
  )}`;
  const running = inFlight.get(key);

  if (running) {
    return running;
  }

  const run = runReconcile(options)
    .then((result) => {
      recordRun(result, options.definition.execution);
      return result;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, run);
  return run;
};

const runReconcile = async ({
  definition,
  esClient,
  logger,
  namespace,
  signal,
}: ReconcileOptions): Promise<ReconcileResult> => {
  const { id, resource, baseline, versions } = definition;
  const resourceName = resolveName(resource, namespace);
  const declared = sortedVersionNumbers(versions);
  const target = declared.length > 0 ? declared[declared.length - 1] : baseline;
  const abortable = { signal };

  const base: Omit<ReconcileResult, 'status' | 'installed' | 'target' | 'applied'> = {
    migrationId: id,
    resourceName,
    namespace,
  };

  if (!(await indexExists(esClient, resourceName, abortable))) {
    await createIndex(
      esClient,
      resourceName,
      mappingsAtVersion(definition, target),
      target,
      abortable
    );
    logger.info(`[${id}] created ${resourceName} at version ${target}`);
    return { ...base, status: 'created', installed: target, target, applied: [] };
  }

  const installed = (await readVersion(esClient, resourceName, abortable)) ?? baseline;

  if (installed >= target) {
    return { ...base, status: 'up_to_date', installed, target, applied: [] };
  }

  const applied: number[] = [];

  for (const version of declared.filter((candidate) => candidate > installed)) {
    const step = versions[version];

    // Stop between steps rather than mid-step, so the stamp always matches what was
    // applied and the next run resumes cleanly.
    if (signal?.aborted) {
      logger.info(`[${id}] ${resourceName} aborted after version ${applied.at(-1) ?? installed}`);
      return { ...base, status: 'migrated', installed, target, applied };
    }

    try {
      await applyStep({
        definition,
        step,
        version,
        esClient,
        logger,
        namespace,
        resourceName,
        signal,
      });
      applied.push(version);
    } catch (error) {
      // Elasticsearch is the final authority: a field-limit breach or a rule the static
      // verifier does not model still surfaces here, and the two need different remedies.
      const message = describeEsRefusal(error);
      logger.error(
        `[${id}] ${resourceName} failed applying version ${version} ` +
          `(${classifyEsError(error)}): ${message}`
      );
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
  definition,
  step,
  version,
  esClient,
  logger,
  namespace,
  resourceName,
  signal,
}: ApplyStepArgs): Promise<void> => {
  if (step.change === 'additive') {
    reportDrift({ definition, step, version, namespace, logger });
    await applyMappings(esClient, resourceName, step.mappings, version, { signal });
    return;
  }

  // The library declares and orders data steps; the plugin owns the body. The signal is
  // handed over too, since a backfill is the most likely thing to outlive the timeout.
  await step.run({ esClient, logger, resourceName, namespace, signal });
  await stampVersion(esClient, resourceName, version, { signal });
};

/**
 * Surfaces a declared removal that Elasticsearch will not apply.
 *
 * Re-derived here rather than carried from `defineMigration`, because drift is a
 * property of applying a step, not of declaring one - and it needs the namespace, which
 * the declaration does not have.
 *
 * Not a failure: the step still applies, and refusing would block a legitimate
 * declaration cleanup. But the index keeps the field, so the declaration stops matching
 * reality and that should not be silent.
 */
const reportDrift = ({
  definition,
  step,
  version,
  namespace,
  logger,
}: Pick<ApplyStepArgs, 'definition' | 'step' | 'version' | 'namespace' | 'logger'>): void => {
  if (step.change !== 'additive') {
    return;
  }

  const previous = previousMappings(definition, version);
  if (previous === undefined) {
    return;
  }

  const { drift } = verifyAdditive(
    previous,
    step.mappings,
    definition.resource.backing ?? 'concrete_index'
  );

  if (drift.length === 0) {
    return;
  }

  recordDrift(definition.id, namespace, drift);
  drift.forEach(({ path, detail }) =>
    logger.warn(`[${definition.id}] ${namespace} v${version} drift at ${path}: ${detail}`)
  );
};

/** The mappings of the newest additive version strictly below the given one. */
const previousMappings = (
  definition: MigrationDefinition,
  version: number
): MappingTypeMapping | undefined => {
  const earlier = sortedVersionNumbers(definition.versions)
    .filter((candidate) => candidate < version)
    .reverse();

  for (const candidate of earlier) {
    const step = definition.versions[candidate];
    if (step.change === 'additive') {
      return step.mappings;
    }
  }

  return undefined;
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
