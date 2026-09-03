/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunQuotaConsumeRequest, RunQuotaConsumeResponse } from '../../../common/run_quotas';
import { mutateRunQuotaLedger, readRunQuotaSettings } from './repository';
import { dayKey, resolveDailyWindow } from './window';
import type { RunQuotaSavedObjectsRepository } from './repository';

export const consumeRunQuota = async ({
  internalRepository,
  ...request
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
} & RunQuotaConsumeRequest): Promise<RunQuotaConsumeResponse> => {
  const date = dayKey(resolveDailyWindow());
  const settings = await readRunQuotaSettings(internalRepository);
  const limit = settings.limits[request.group];
  const isCriticalInvestigation = request.group === 'investigation' && request.critical;

  return mutateRunQuotaLedger<RunQuotaConsumeResponse>({
    internalRepository,
    date,
    group: request.group,
    mutation: (ledger) => {
      if (settings.enabled && limit > 0 && ledger.count >= limit && !isCriticalInvestigation) {
        return { result: { allowed: false } };
      }

      return {
        attributes: { count: ledger.count + 1 },
        result: { allowed: true },
      };
    },
  });
};
