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
import { finalizeWorkerDecision, getOrCreatePendingWorkerDecision } from './worker_decision';
import type { RunQuotaSavedObjectsRepository } from './repository';

export const consumeRunQuota = async ({
  internalRepository,
  executionReader,
  request,
  executionId,
  group,
  spaceId,
  now = new Date(),
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  executionReader: RunQuotaExecutionReader;
  request: KibanaRequest;
  executionId: string;
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  now?: Date;
}): Promise<RunQuotaConsumeResponse> => {
  const { grantKey } = await validateWorkerProvenance({
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
  const timestamp = now.toISOString();
  const decision = await getOrCreatePendingWorkerDecision({
    internalRepository,
    group,
    grantKey,
    executionId,
    ledgerDate: dayKey(resolveDailyWindow(now)),
    limitSnapshot: limit.max,
    createdAt: timestamp,
  });

  if (decision.state !== 'pending') {
    return { allowed: decision.state === 'allowed' };
  }

  let allowed = false;
  await mutateRunQuotaLedger({
    internalRepository,
    date: decision.ledgerDate,
    group,
    mutation: (ledger) => {
      if (ledger.consumedGrantKeys.includes(decision.grantKey)) {
        allowed = true;
        return {};
      }
      if (ledger.count >= decision.limitSnapshot) {
        allowed = false;
        return {};
      }
      allowed = true;
      return {
        count: ledger.count + 1,
        consumedGrantKeys: [...ledger.consumedGrantKeys, decision.grantKey],
      };
    },
  });

  const finalized = await finalizeWorkerDecision({
    internalRepository,
    grantKey: decision.grantKey,
    executionId,
    allowed,
    decidedAt: timestamp,
  });

  return { allowed: finalized.state === 'allowed' };
};
