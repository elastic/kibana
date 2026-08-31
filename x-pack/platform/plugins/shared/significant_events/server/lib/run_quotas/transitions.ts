/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunBudgetGroupId, WorkerRunBudgetGroupId } from '../../../common/run_quotas';
import type { RunQuotaApplicabilityGeneration, RunQuotaSettingsAttributes } from './saved_objects';
import {
  mutateRunQuotaHeartbeat,
  type RunQuotaSavedObjectsRepository,
  type RunQuotaSettingsPatch,
} from './repository';

const advanceGeneration = (
  current: RunQuotaApplicabilityGeneration | undefined,
  changedAt: string
): RunQuotaApplicabilityGeneration => ({
  generation: (current?.generation ?? 0) + 1,
  changedAt,
});

export const applyRunQuotaSettingsApplicabilityTransition = ({
  current,
  patch,
  global,
  groups,
  changedAt,
}: {
  current: RunQuotaSettingsAttributes;
  patch: RunQuotaSettingsPatch;
  global: boolean;
  groups: RunBudgetGroupId[];
  changedAt: string;
}): RunQuotaSettingsPatch => {
  if (!global && groups.length === 0) {
    return patch;
  }

  const currentApplicability = current.applicability;
  const globalGeneration = global
    ? advanceGeneration(currentApplicability?.global, changedAt)
    : currentApplicability?.global ?? { generation: 0, changedAt };
  const groupGenerations = Object.fromEntries(
    groups.map((group) => [
      group,
      advanceGeneration(currentApplicability?.groups[group], changedAt),
    ])
  );

  return {
    ...patch,
    applicability: {
      global: globalGeneration,
      groups: {
        ...currentApplicability?.groups,
        ...groupGenerations,
      },
    },
  };
};

export const recordRunQuotaScheduleTransition = async ({
  internalRepository,
  group,
  spaceId,
  changedAt,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  changedAt: string;
}): Promise<void> => {
  await mutateRunQuotaHeartbeat({
    internalRepository,
    group,
    spaceId,
    initialChangedAt: changedAt,
    mutation: (current) => ({
      scheduleGeneration: current.scheduleGeneration + 1,
      scheduleGenerationChangedAt: changedAt,
    }),
  });
};
