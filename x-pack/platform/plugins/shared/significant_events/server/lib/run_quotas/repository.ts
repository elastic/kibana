/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  DEFAULT_RUN_LIMITS,
  DEFAULT_RUN_QUOTA_TIME_ZONE,
  type RunBudgetGroupId,
  type RunLimit,
} from '../../../common/run_quotas';
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  RUN_QUOTA_MAX_ALLOWED_GRANT_KEYS,
  RUN_QUOTA_MAX_DENIED_GRANT_KEYS,
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
  ]);

export interface RunQuotaSettingsPatch extends Record<string, unknown> {
  timezone?: string;
  limits?: Record<string, RunLimit>;
  enforcementEnabled?: boolean;
  enabledBy?: string;
  enabledAt?: string;
  updatedBy?: string;
  updatedAt?: string;
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
  const { limits, ...topLevelPatch } = patch;

  return {
    ...current,
    ...topLevelPatch,
    limits: {
      ...current.limits,
      ...limits,
    },
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
  allowedGrantKeys: [],
  deniedGrantKeys: [],
  decisions: [],
  skipped: [],
  totalSkipped: 0,
  decisionsEvicted: false,
});

export type RunQuotaLedgerMutation = (
  current: RunQuotaLedgerAttributes
) => Partial<RunQuotaLedgerAttributes>;

const assertLedgerInvariant = (ledger: RunQuotaLedgerAttributes): void => {
  if (ledger.allowedGrantKeys.length > RUN_QUOTA_MAX_ALLOWED_GRANT_KEYS) {
    throw new Error('Run quota ledger has too many allowed worker grant keys');
  }
  if (ledger.deniedGrantKeys.length > RUN_QUOTA_MAX_DENIED_GRANT_KEYS) {
    throw new Error('Run quota ledger has too many denied worker grant keys');
  }
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
