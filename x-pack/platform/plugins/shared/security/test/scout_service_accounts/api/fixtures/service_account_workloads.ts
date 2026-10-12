/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

/** The service accounts test plugin's route for one of its workloads. */
export const workloadPath = (workloadId: string) => `internal/service_accounts_test/${workloadId}`;

/** Binds one of the test plugin's workloads to a service account, as the `elastic` user. */
export const bindWorkload = async (
  kbnClient: KbnClient,
  workloadId: string,
  serviceAccountId: string
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: workloadPath(workloadId),
    body: { operation: 'bind', serviceAccountId },
    retries: 0,
  });
};

/**
 * Unbinds the given workloads. Tries every one of them before it throws, so one failure doesn't
 * leave the rest bound.
 */
export const unbindWorkloads = async (
  kbnClient: KbnClient,
  workloadIds: string[]
): Promise<void> => {
  const failures: Error[] = [];
  for (const workloadId of workloadIds) {
    try {
      await kbnClient.request({
        method: 'POST',
        path: workloadPath(workloadId),
        body: { operation: 'unbind' },
      });
    } catch (error) {
      failures.push(
        error instanceof Error ? error : new Error(`Failed to unbind workload [${workloadId}].`)
      );
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, `Failed to unbind ${failures.length} workloads.`);
  }
};
