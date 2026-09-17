/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import { pairwise, concatMap, takeUntil } from 'rxjs';
import type {
  CoreStart,
  FeatureFlagsStart,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { FF_DUAL_PROCESS_ENABLED } from '../../../common';
import { hasPriorityExtractionGate } from '../../../common/domain/definitions/registry';
import { ENGINE_STATUS } from '../../domain/constants';
import { EngineDescriptorTypeName, EngineDescriptorClient } from '../../domain/saved_objects';
import type { EngineDescriptor } from '../../domain/saved_objects';

/**
 * Whether the dual-process log extraction architecture is active for this deployment.
 * Reads from LaunchDarkly via core featureFlags; defaults to false so self-managed and
 * unreachable deployments always run single-process.
 */
export const isDualProcessEnabled = (featureFlags: FeatureFlagsStart): Promise<boolean> =>
  featureFlags.getBooleanValue(FF_DUAL_PROCESS_ENABLED, false);

// ---------------------------------------------------------------------------
// Flag-reactive stop / restart
// ---------------------------------------------------------------------------

const MAX_ENGINES_PER_PAGE = 10_000;

interface EngineEntry {
  attributes: EngineDescriptor;
  namespace: string;
}

async function findAllEngineDescriptors(coreStart: CoreStart): Promise<EngineEntry[]> {
  const soClient = coreStart.savedObjects.createInternalRepository([EngineDescriptorTypeName]);
  const { saved_objects } = await soClient.find<EngineDescriptor>({
    type: EngineDescriptorTypeName,
    perPage: MAX_ENGINES_PER_PAGE,
    namespaces: ['*'],
  });

  return saved_objects.flatMap((so) => {
    const namespace = so.namespaces?.[0];
    return namespace ? [{ attributes: so.attributes, namespace }] : [];
  });
}

/**
 * Removes the non-priority extraction task for every engine where the dual-process
 * flag just flipped off and the non-priority process is still tracked as started.
 *
 * The nonPriorityStatus guard ensures only one node acts per engine; subsequent
 * nodes find the status already cleared and skip.
 */
async function teardownNonPriorityTasks({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}): Promise<void> {
  const engines = await findAllEngineDescriptors(coreStart);

  const targets = engines.filter(
    ({ attributes }) =>
      hasPriorityExtractionGate(attributes.type) &&
      attributes.nonPriorityStatus === ENGINE_STATUS.STARTED
  );

  await Promise.all(
    targets.map(async ({ attributes: { type }, namespace }) => {
      logger.info(
        `Dual-process flag turned off: suspending non-priority extraction for ${type} in namespace ${namespace}`
      );
      const soClient = coreStart.savedObjects.createInternalRepository([EngineDescriptorTypeName]);
      const engineDescriptorClient = new EngineDescriptorClient(
        soClient as unknown as SavedObjectsClientContract,
        namespace,
        logger
      );
      await engineDescriptorClient.update(type, {
        nonPriorityStatus: ENGINE_STATUS.STOPPED,
        nonPriorityLogExtractionState: null,
        nonPriorityError: null,
      });
    })
  );
}

/**
 * Marks the non-priority extraction process as started in the SO for every engine where
 * the dual-process flag just flipped on and the engine is actively running.
 *
 * Engines with nonPriorityStatus === null (pre-v10, not yet bootstrapped) are handled
 * separately by the priority task's bootstrap step. Task Manager scheduling happens
 * there too, so this function only manages SO state for already-bootstrapped engines.
 */
async function enableNonPriorityTasks({
  coreStart,
  logger,
}: {
  coreStart: CoreStart;
  logger: Logger;
}): Promise<void> {
  const engines = await findAllEngineDescriptors(coreStart);

  const targets = engines.filter(
    ({ attributes }) =>
      hasPriorityExtractionGate(attributes.type) &&
      attributes.status === ENGINE_STATUS.STARTED &&
      attributes.nonPriorityStatus === ENGINE_STATUS.STOPPED
  );

  await Promise.all(
    targets.map(async ({ attributes: { type }, namespace }) => {
      logger.info(
        `Dual-process flag turned on: resuming non-priority extraction for ${type} in namespace ${namespace}`
      );
      const soClient = coreStart.savedObjects.createInternalRepository([EngineDescriptorTypeName]);
      const engineDescriptorClient = new EngineDescriptorClient(
        soClient as unknown as SavedObjectsClientContract,
        namespace,
        logger
      );
      await engineDescriptorClient.update(type, { nonPriorityStatus: ENGINE_STATUS.STARTED });
    })
  );
}

/**
 * Subscribes to the dual-process feature flag and reacts to transitions:
 *
 * - true -> false: removes the non-priority extraction task and clears its cursor
 *   for every active engine. Guarded by nonPriorityStatus === 'started' so only
 *   one Kibana node acts.
 *
 * - false -> true: schedules the non-priority extraction task (cursor-free, so it
 *   starts from now - lookbackPeriod) for every started engine that supports it.
 *   Guarded by nonPriorityStatus == null so only one node acts; Task Manager
 *   deduplicates the schedule by task ID.
 *
 * Transitions are processed sequentially (concatMap) so a rapid flip cannot
 * interleave teardown and re-enable operations.
 *
 * The subscription is torn down when stop$ emits.
 */
export const subscribeToDualProcessFlag = ({
  coreStart,
  logger,
  stop$,
}: {
  coreStart: CoreStart;
  logger: Logger;
  stop$: Subject<void>;
}): void => {
  // Reconcile on startup: pairwise() only reacts to in-session transitions, so flag changes
  // between restarts (config edits, version upgrades) are handled here.
  isDualProcessEnabled(coreStart.featureFlags)
    .then((enabled) =>
      enabled
        ? enableNonPriorityTasks({ coreStart, logger })
        : teardownNonPriorityTasks({ coreStart, logger })
    )
    .catch((err: Error) =>
      logger.error(`Dual-process startup reconciliation failed: ${err.message}`)
    );

  coreStart.featureFlags
    .getBooleanValue$(FF_DUAL_PROCESS_ENABLED, false)
    .pipe(
      pairwise(),
      takeUntil(stop$),
      concatMap(([prev, curr]) => {
        if (prev === curr) return Promise.resolve();
        const transition =
          prev && !curr
            ? teardownNonPriorityTasks({ coreStart, logger })
            : enableNonPriorityTasks({ coreStart, logger });
        return transition.catch((err: Error) =>
          logger.error(`Dual-process flag transition failed: ${err.message}`)
        );
      })
    )
    .subscribe({
      error: (err: Error) => logger.error(`Dual-process flag subscription error: ${err.message}`),
    });
};
