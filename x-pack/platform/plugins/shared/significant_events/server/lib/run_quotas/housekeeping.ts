/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  SavedObjectsErrorHelpers,
  type CoreSetup,
  type Logger,
  type SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
} from '@kbn/management-settings-ids';
import {
  TaskCost,
  TaskPriority,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES } from '../../../common/constants';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  type SignificantEventsMaintenanceStateAttributes,
} from '../maintenance/saved_object';
import type {
  SignificantEventsPluginStartDependencies,
  SignificantEventsServer,
} from '../../types';
import {
  computeRunQuotaDriverHealth,
  type DetectionReachabilityTarget,
  type KiReachabilityTarget,
} from './reachability';
import {
  createRunQuotaInternalRepository,
  mutateRunQuotaSettings,
  readRunQuotaSettings,
} from './repository';
import { sweepExpiredRunQuotaDocuments } from './retention';

export const RUN_QUOTA_HOUSEKEEPING_TASK_TYPE = 'significant-events:run-quota-housekeeping';
export const RUN_QUOTA_HOUSEKEEPING_TASK_ID = RUN_QUOTA_HOUSEKEEPING_TASK_TYPE;
export const RUN_QUOTA_HOUSEKEEPING_INTERVAL = '5m';
export const RUN_QUOTA_HOUSEKEEPING_INTERVAL_MS = 5 * 60_000;

const RETENTION_DAYS = 7;
const SPACE_PAGE_SIZE = 1000;
const SPACE_SAVED_OBJECT_TYPE = 'space';

export interface ReachabilityTargetsResult<T> {
  targets: T;
  unavailable: boolean;
}

export interface RunQuotaHousekeepingDependencies {
  internalRepository: SavedObjectsClientContract;
  getDetectionTargets: () => Promise<ReachabilityTargetsResult<DetectionReachabilityTarget[]>>;
  getKiTarget: () => Promise<ReachabilityTargetsResult<KiReachabilityTarget>>;
  getMaintenancePaused: () => Promise<ReachabilityTargetsResult<boolean>>;
  logger: Logger;
  now?: Date;
  signal?: AbortSignal;
}

const retentionCutoffDay = (now: Date): string => {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  return cutoff.toISOString().slice(0, 10);
};

export const runRunQuotaHousekeeping = async ({
  internalRepository,
  getDetectionTargets,
  getKiTarget,
  getMaintenancePaused,
  logger,
  now = new Date(),
  signal,
}: RunQuotaHousekeepingDependencies): Promise<{ completed: boolean }> => {
  const attemptedAt = now.toISOString();
  await mutateRunQuotaSettings(internalRepository, () => ({ lastAttemptedAt: attemptedAt }));
  const settings = await readRunQuotaSettings(internalRepository);
  const cutoffDay = retentionCutoffDay(now);
  const retention =
    settings.retentionWatermark && settings.retentionWatermark >= cutoffDay
      ? { complete: true }
      : await sweepExpiredRunQuotaDocuments({
          internalRepository,
          cutoffDay,
          signal,
        });

  const [detection, ki, maintenance] = await Promise.all([
    getDetectionTargets(),
    getKiTarget(),
    getMaintenancePaused(),
  ]);
  const targetUnavailable = detection.unavailable || ki.unavailable || maintenance.unavailable;
  if (targetUnavailable) {
    logger.warn('Run quota housekeeping could not resolve every driver applicability target');
  }

  const driverHealth = await computeRunQuotaDriverHealth({
    internalRepository,
    settings,
    detectionTargets: detection.targets,
    kiTarget: ki.targets,
    maintenancePaused: maintenance.targets,
    detectionUnavailable: detection.unavailable || maintenance.unavailable,
    kiUnavailable: ki.unavailable || maintenance.unavailable,
    now: attemptedAt,
    signal,
  });
  const staleSpaceIds = driverHealth.detection.staleSpaceIds;
  if (staleSpaceIds && staleSpaceIds.length > 0) {
    logger.warn(`Detection run quota driver is stale in spaces: ${staleSpaceIds.join(', ')}`);
  }
  const completed = retention.complete && !targetUnavailable && !signal?.aborted;

  await mutateRunQuotaSettings(internalRepository, () => ({
    driverHealth,
    ...(retention.complete ? { retentionWatermark: cutoffDay } : {}),
    ...(completed ? { lastHousekeepingAt: attemptedAt } : {}),
  }));
  return { completed };
};

const listSpaceIds = async (
  internalRepository: SavedObjectsClientContract,
  signal: AbortSignal
): Promise<string[]> => {
  const spaceIds = new Set<string>([DEFAULT_SPACE_ID]);
  let page = 1;
  while (!signal.aborted) {
    const response = await internalRepository.find({
      type: SPACE_SAVED_OBJECT_TYPE,
      page,
      perPage: SPACE_PAGE_SIZE,
    });
    response.saved_objects.forEach(({ id }) => spaceIds.add(id));
    if (page * SPACE_PAGE_SIZE >= response.total) {
      return [...spaceIds];
    }
    page += 1;
  }
  return [...spaceIds];
};

const toIsoString = (value: Date | string | undefined): string | undefined =>
  value instanceof Date ? value.toISOString() : value;

export const createRunQuotaHousekeepingProductionDependencies = async ({
  coreStart,
  server,
  logger,
  signal,
}: {
  coreStart: Awaited<ReturnType<CoreSetup['getStartServices']>>[0];
  server: SignificantEventsServer;
  logger: Logger;
  signal: AbortSignal;
}): Promise<RunQuotaHousekeepingDependencies> => {
  const internalRepository = createRunQuotaInternalRepository(server);
  const uiSettingsRepository = coreStart.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [SPACE_SAVED_OBJECT_TYPE],
  });
  const managementApi = server.workflowsManagement?.management;

  return {
    internalRepository,
    logger,
    signal,
    getDetectionTargets: async () => {
      try {
        const spaceIds = await listSpaceIds(uiSettingsRepository, signal);
        const targets = await Promise.all(
          spaceIds.map(async (spaceId): Promise<DetectionReachabilityTarget> => {
            const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
              uiSettingsRepository.asScopedToNamespace(spaceId)
            );
            const [enabled, reviewIntervalMinutes, workflow] = await Promise.all([
              uiSettingsClient.get<boolean>(
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
              ),
              uiSettingsClient.get<number>(
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES
              ),
              managementApi?.getWorkflow(
                `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-${spaceId}`,
                spaceId
              ),
            ]);
            return {
              spaceId,
              enabled: enabled ?? false,
              reviewIntervalMinutes:
                reviewIntervalMinutes ?? DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
              driverUpdatedAt: toIsoString(workflow?.lastUpdatedAt),
            };
          })
        );
        return { targets, unavailable: false };
      } catch (error) {
        logger.warn(
          `Detection reachability collection failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { targets: [], unavailable: true };
      }
    },
    getKiTarget: async () => {
      try {
        const globalUiSettingsClient =
          coreStart.uiSettings.globalAsScopedToClient(uiSettingsRepository);
        const [enabled, workflow] = await Promise.all([
          globalUiSettingsClient.get<boolean>(
            OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
          ),
          managementApi?.getWorkflow(
            SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
            DEFAULT_SPACE_ID
          ),
        ]);
        return {
          targets: {
            enabled: enabled ?? false,
            driverUpdatedAt: toIsoString(workflow?.lastUpdatedAt),
          },
          unavailable: false,
        };
      } catch (error) {
        logger.warn(
          `KI reachability collection failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { targets: { enabled: false }, unavailable: true };
      }
    },
    getMaintenancePaused: async () => {
      const maintenanceRepository = coreStart.savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE],
      });
      try {
        const result = await maintenanceRepository.get<SignificantEventsMaintenanceStateAttributes>(
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
          SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
        );
        return { targets: result.attributes.state === 'paused', unavailable: false };
      } catch (error) {
        if (
          SavedObjectsErrorHelpers.isNotFoundError(
            error as Parameters<typeof SavedObjectsErrorHelpers.isNotFoundError>[0]
          )
        ) {
          return { targets: false, unavailable: false };
        }
        logger.warn(
          `Maintenance-state collection failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { targets: false, unavailable: true };
      }
    },
  };
};

export const registerRunQuotaHousekeepingTask = ({
  taskManager,
  core,
  getServer,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  core: CoreSetup<SignificantEventsPluginStartDependencies>;
  getServer: () => SignificantEventsServer | undefined;
  logger: Logger;
}): void => {
  taskManager.registerTaskDefinitions({
    [RUN_QUOTA_HOUSEKEEPING_TASK_TYPE]: {
      title: 'Significant Events run quota housekeeping',
      description: 'Maintains run quota retention and scheduled-driver reachability.',
      timeout: '2m',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Low,
      stateSchemaByVersion: {
        1: {
          schema: schema.object({}),
          up: () => ({}),
        },
      },
      createTaskRunner: ({ signal }) => ({
        run: async () => {
          try {
            const server = getServer();
            if (!server) {
              logger.error(
                'Run quota housekeeping skipped because the plugin server is unavailable'
              );
              return { state: {} };
            }
            const [coreStart] = await core.getStartServices();
            const dependencies = await createRunQuotaHousekeepingProductionDependencies({
              coreStart,
              server,
              logger,
              signal,
            });
            await runRunQuotaHousekeeping(dependencies);
          } catch (error) {
            logger.error(
              `Run quota housekeeping failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
          return { state: {} };
        },
      }),
    },
  });
};

export const ensureRunQuotaHousekeepingScheduled = async (
  taskManager: TaskManagerStartContract
): Promise<void> => {
  await taskManager.ensureScheduled({
    id: RUN_QUOTA_HOUSEKEEPING_TASK_ID,
    taskType: RUN_QUOTA_HOUSEKEEPING_TASK_TYPE,
    schedule: { interval: RUN_QUOTA_HOUSEKEEPING_INTERVAL },
    params: {},
    state: {},
  });
};
