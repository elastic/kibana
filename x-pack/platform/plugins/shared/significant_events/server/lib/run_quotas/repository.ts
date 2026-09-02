/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  DEFAULT_RUN_LIMITS,
  DEFAULT_RUN_QUOTA_TIME_ZONE,
  type RunBudgetGroupId,
  type RunLimit,
  type WorkerRunBudgetGroupId,
} from '../../../common/run_quotas';
import {
  RUN_QUOTA_HEARTBEAT_SO_TYPE,
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  RUN_QUOTA_WORKER_DECISION_SO_TYPE,
  type PersistedRunQuotaDriverHealth,
  type RunQuotaApplicabilityState,
  type RunQuotaHeartbeatAttributes,
  type RunQuotaLedgerAttributes,
  type RunQuotaSettingsAttributes,
} from './saved_objects';
import type { SignificantEventsServer } from '../../types';

const MAX_OCC_ATTEMPTS = 100;

export type RunQuotaSavedObjectsRepository = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update'
>;

export const createRunQuotaInternalRepository = (
  server: SignificantEventsServer
): SavedObjectsClientContract =>
  server.core.savedObjects.createInternalRepository([
    RUN_QUOTA_SETTINGS_SO_TYPE,
    RUN_QUOTA_LEDGER_SO_TYPE,
    RUN_QUOTA_WORKER_DECISION_SO_TYPE,
    RUN_QUOTA_HEARTBEAT_SO_TYPE,
  ]);

export interface RunQuotaSettingsPatch extends Record<string, unknown> {
  timezone?: string;
  limits?: Record<string, RunLimit>;
  enforcementEnabled?: boolean;
  enabledBy?: string;
  enabledAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  lastAttemptedAt?: string;
  lastHousekeepingAt?: string;
  retentionWatermark?: string;
  applicability?: Partial<RunQuotaApplicabilityState>;
  driverHealth?: Record<string, PersistedRunQuotaDriverHealth>;
}

export type RunQuotaSettingsMutation = (
  current: RunQuotaSettingsAttributes
) => RunQuotaSettingsPatch;

const cloneDefaultLimits = (): Record<string, RunLimit> =>
  Object.fromEntries(
    Object.entries(DEFAULT_RUN_LIMITS).map(([group, limit]) => [group, { ...limit }])
  );

export const createDefaultRunQuotaSettingsAttributes = (): RunQuotaSettingsAttributes => ({
  timezone: DEFAULT_RUN_QUOTA_TIME_ZONE,
  limits: cloneDefaultLimits(),
  enforcementEnabled: false,
});

const mergeSettingsPatch = (
  current: RunQuotaSettingsAttributes,
  patch: RunQuotaSettingsPatch
): RunQuotaSettingsAttributes => {
  const { limits, applicability, driverHealth, ...topLevelPatch } = patch;

  return {
    ...current,
    ...topLevelPatch,
    limits: {
      ...current.limits,
      ...limits,
    },
    ...(applicability
      ? {
          applicability: {
            ...(current.applicability ?? {
              global: applicability.global,
              groups: {},
            }),
            ...applicability,
            groups: {
              ...current.applicability?.groups,
              ...applicability.groups,
            },
          } as RunQuotaApplicabilityState,
        }
      : {}),
    ...(driverHealth
      ? {
          driverHealth: {
            ...current.driverHealth,
            ...driverHealth,
          },
        }
      : {}),
  };
};

export const readRunQuotaSettings = async (
  internalRepository: RunQuotaSavedObjectsRepository
): Promise<RunQuotaSettingsAttributes> => {
  try {
    const savedObject = await internalRepository.get<RunQuotaSettingsAttributes>(
      RUN_QUOTA_SETTINGS_SO_TYPE,
      RUN_QUOTA_SETTINGS_SO_ID
    );
    return mergeSettingsPatch(createDefaultRunQuotaSettingsAttributes(), savedObject.attributes);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return createDefaultRunQuotaSettingsAttributes();
    }
    throw error;
  }
};

export const mutateRunQuotaSettings = async (
  internalRepository: RunQuotaSavedObjectsRepository,
  mutation: RunQuotaSettingsMutation
): Promise<RunQuotaSettingsAttributes> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: Awaited<ReturnType<RunQuotaSavedObjectsRepository['get']>> | undefined;

    try {
      currentSavedObject = await internalRepository.get<RunQuotaSettingsAttributes>(
        RUN_QUOTA_SETTINGS_SO_TYPE,
        RUN_QUOTA_SETTINGS_SO_ID
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }

    const current = currentSavedObject
      ? mergeSettingsPatch(
          createDefaultRunQuotaSettingsAttributes(),
          currentSavedObject.attributes as RunQuotaSettingsAttributes
        )
      : createDefaultRunQuotaSettingsAttributes();
    const next = mergeSettingsPatch(current, mutation(current));

    try {
      const savedObject = currentSavedObject
        ? await internalRepository.update<RunQuotaSettingsAttributes>(
            RUN_QUOTA_SETTINGS_SO_TYPE,
            RUN_QUOTA_SETTINGS_SO_ID,
            next,
            { version: currentSavedObject.version }
          )
        : await internalRepository.create<RunQuotaSettingsAttributes>(
            RUN_QUOTA_SETTINGS_SO_TYPE,
            next,
            { id: RUN_QUOTA_SETTINGS_SO_ID, overwrite: false }
          );
      return { ...next, ...savedObject.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota settings could not be updated after repeated conflicts');
};

export const getRunQuotaLedgerId = (date: string, group: string): string => `${date}-${group}`;

export const createEmptyRunQuotaLedger = (
  date: string,
  group: RunBudgetGroupId
): RunQuotaLedgerAttributes => ({
  date,
  group,
  count: 0,
  withinLimitGrantCount: 0,
  criticalPastLimitGrantCount: 0,
  consumedGrantKeys: [],
  decisions: [],
  skipped: [],
  totalSkipped: 0,
  decisionsEvicted: false,
});

export type RunQuotaLedgerMutation = (
  current: RunQuotaLedgerAttributes
) => Partial<RunQuotaLedgerAttributes>;

const assertLedgerInvariant = (ledger: RunQuotaLedgerAttributes): void => {
  if (
    ledger.group === 'investigation' &&
    ledger.count !== ledger.withinLimitGrantCount + ledger.criticalPastLimitGrantCount
  ) {
    throw new Error('Investigation run quota ledger grant counters do not sum to count');
  }
};

export const mutateRunQuotaLedger = async ({
  internalRepository,
  date,
  group,
  mutation,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  date: string;
  group: RunBudgetGroupId;
  mutation: RunQuotaLedgerMutation;
}): Promise<RunQuotaLedgerAttributes> => {
  const id = getRunQuotaLedgerId(date, group);

  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: Awaited<ReturnType<RunQuotaSavedObjectsRepository['get']>> | undefined;

    try {
      currentSavedObject = await internalRepository.get<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        id
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }

    const current = currentSavedObject
      ? (currentSavedObject.attributes as RunQuotaLedgerAttributes)
      : createEmptyRunQuotaLedger(date, group);
    const next = {
      ...current,
      ...mutation(current),
      date,
      group,
    };
    assertLedgerInvariant(next);

    try {
      const savedObject = currentSavedObject
        ? await internalRepository.update<RunQuotaLedgerAttributes>(
            RUN_QUOTA_LEDGER_SO_TYPE,
            id,
            next,
            { version: currentSavedObject.version }
          )
        : await internalRepository.create<RunQuotaLedgerAttributes>(
            RUN_QUOTA_LEDGER_SO_TYPE,
            next,
            { id, overwrite: false }
          );
      return { ...next, ...savedObject.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota ledger could not be updated after repeated conflicts');
};

export const getRunQuotaHeartbeatId = (group: WorkerRunBudgetGroupId, spaceId: string): string =>
  createHash('sha256')
    .update(JSON.stringify([group, spaceId]))
    .digest('hex');

export type RunQuotaHeartbeatMutation = (
  current: RunQuotaHeartbeatAttributes
) => Partial<RunQuotaHeartbeatAttributes>;

export const mutateRunQuotaHeartbeat = async ({
  internalRepository,
  group,
  spaceId,
  initialChangedAt,
  mutation,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  initialChangedAt: string;
  mutation: RunQuotaHeartbeatMutation;
}): Promise<RunQuotaHeartbeatAttributes> => {
  const id = getRunQuotaHeartbeatId(group, spaceId);

  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: Awaited<ReturnType<RunQuotaSavedObjectsRepository['get']>> | undefined;

    try {
      currentSavedObject = await internalRepository.get<RunQuotaHeartbeatAttributes>(
        RUN_QUOTA_HEARTBEAT_SO_TYPE,
        id
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }

    const current: RunQuotaHeartbeatAttributes = currentSavedObject
      ? (currentSavedObject.attributes as RunQuotaHeartbeatAttributes)
      : {
          group,
          spaceId,
          monitoringEnabled: false,
          scheduleGeneration: 0,
          scheduleGenerationChangedAt: initialChangedAt,
        };
    const next = {
      ...current,
      ...mutation(current),
      group,
      spaceId,
    };

    try {
      const savedObject = currentSavedObject
        ? await internalRepository.update<RunQuotaHeartbeatAttributes>(
            RUN_QUOTA_HEARTBEAT_SO_TYPE,
            id,
            next,
            { version: currentSavedObject.version }
          )
        : await internalRepository.create<RunQuotaHeartbeatAttributes>(
            RUN_QUOTA_HEARTBEAT_SO_TYPE,
            next,
            { id, overwrite: false }
          );
      return { ...next, ...savedObject.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota heartbeat could not be updated after repeated conflicts');
};

export const updateRunQuotaHeartbeatMaxTimestamp = async ({
  internalRepository,
  group,
  spaceId,
  driverExecutionId,
  recordedAt,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  driverExecutionId: string;
  recordedAt: string;
}): Promise<{ attributes: RunQuotaHeartbeatAttributes; recorded: boolean }> => {
  let recorded = false;
  const attributes = await mutateRunQuotaHeartbeat({
    internalRepository,
    group,
    spaceId,
    initialChangedAt: recordedAt,
    mutation: (current) => {
      if (current.recordedAt && current.recordedAt >= recordedAt) {
        recorded = false;
        return {};
      }
      recorded = true;
      return { driverExecutionId, recordedAt };
    },
  });

  return { attributes, recorded };
};
