/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

/** One of the test plugin's workloads, in the default space unless `spaceId` says otherwise. */
export interface TestWorkload {
  workloadId: string;
  spaceId?: string;
}

/** The service accounts test plugin's route for one of its workloads, in the workload's space. */
export const workloadPath = (workloadId: string, spaceId?: string) =>
  `${
    spaceId && spaceId !== 'default' ? `s/${spaceId}/` : ''
  }internal/service_accounts_test/${workloadId}`;

/** Binds one of the test plugin's workloads to a service account, as the `elastic` user. */
export const bindWorkload = async (
  kbnClient: KbnClient,
  workloadId: string,
  serviceAccountId: string,
  spaceId?: string
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: workloadPath(workloadId, spaceId),
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
  workloads: TestWorkload[]
): Promise<void> => {
  const failures: Error[] = [];
  for (const { workloadId, spaceId } of workloads) {
    try {
      await kbnClient.request({
        method: 'POST',
        path: workloadPath(workloadId, spaceId),
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
