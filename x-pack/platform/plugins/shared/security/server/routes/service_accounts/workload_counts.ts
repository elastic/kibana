/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { getDetailedErrorMessage } from '../../errors';
import type { ServiceAccountsManagementApi } from '../../service_accounts';

/**
 * Adds the number of bound workloads to each account. A failed count doesn't fail the caller: the
 * accounts come back without counts instead.
 */
export const withWorkloadCounts = async <T extends { id: string; workloadCount?: number }>(
  serviceAccounts: T[],
  management: ServiceAccountsManagementApi,
  logger: Logger
): Promise<T[]> => {
  const ids = serviceAccounts.map(({ id }) => id);
  try {
    const counts = await management.countBoundWorkloads(ids);
    return serviceAccounts.map((account) => ({
      ...account,
      workloadCount: counts.get(account.id) ?? 0,
    }));
  } catch (error) {
    logger.warn(
      `Unable to count the workloads bound to ${
        ids.length
      } service account(s): ${getDetailedErrorMessage(error)}`
    );
    return serviceAccounts;
  }
};
