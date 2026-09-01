/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RunQuotaConsumeResponse, WorkerRunBudgetGroupId } from '../../../common/run_quotas';
import { mutateRunQuotaLedger, readRunQuotaSettings } from './repository';
import type { RunQuotaExecutionReader } from './provenance';
import { validateWorkerProvenance } from './provenance';
import { dayKey, resolveDailyWindow } from './window';
import type { RunQuotaSavedObjectsRepository } from './repository';

export const consumeRunQuota = async ({
  internalRepository,
  executionReader,
  request,
  executionId,
  group,
  spaceId,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  executionReader: RunQuotaExecutionReader;
  request: KibanaRequest;
  executionId: string;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
}): Promise<RunQuotaConsumeResponse> => {
  const { grantKey, taskRunAt } = await validateWorkerProvenance({
    request,
    executionId,
    group,
    spaceId,
    executionReader,
  });
  const settings = await readRunQuotaSettings(internalRepository);
  const limit = settings.limits[group];
  if (!settings.enforcementEnabled || !limit?.enabled) {
    return { allowed: true };
  }

  let allowed = false;
  await mutateRunQuotaLedger({
    internalRepository,
    date: dayKey(resolveDailyWindow(new Date(taskRunAt))),
    group,
    mutation: (ledger) => {
      if (ledger.allowedGrantKeys.includes(grantKey)) {
        allowed = true;
        return undefined;
      }
      if (ledger.count >= limit.max) {
        allowed = false;
        return undefined;
      }
      allowed = true;
      return {
        count: ledger.count + 1,
        allowedGrantKeys: [...ledger.allowedGrantKeys, grantKey],
      };
    },
  });

  return { allowed };
};
