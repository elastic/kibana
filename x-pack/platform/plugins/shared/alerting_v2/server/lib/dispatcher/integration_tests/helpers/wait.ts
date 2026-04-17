/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { adminTestUser } from '@kbn/test';
import { getSupertest, type createRoot, type HttpMethod } from '@kbn/core-test-helpers-kbn-server';
import pRetry from 'p-retry';

type Root = ReturnType<typeof createRoot>;

export const waitForAlertingVTwoSetup = async (root: Root) => {
  const isAlertingVTwoSetupRunning = async () => {
    const statusApi = getSupertestWithAdminUser(root, 'get', '/api/status');
    const resp = await statusApi.send();
    const alertingVTwoStatus = resp.body?.status?.plugins?.alertingVTwo;
    if (alertingVTwoStatus?.meta?.error) {
      throw new Error(`Setup failed: ${JSON.stringify(alertingVTwoStatus)}`);
    }

    return (
      !alertingVTwoStatus ||
      alertingVTwoStatus?.summary !== 'All services and plugins are available'
    );
  };

  while (await isAlertingVTwoSetupRunning()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};

export const waitForDataStreamsReady = async (
  esClient: ElasticsearchClient,
  dataStreamNames: string[]
) => {
  const namePattern = dataStreamNames.join(',');

  await pRetry(
    async () => {
      const response = await esClient.indices.getDataStream({ name: namePattern });
      if (response.data_streams.length < dataStreamNames.length) {
        throw new Error(
          `Expected ${dataStreamNames.length} data streams, got ${response.data_streams.length}`
        );
      }
    },
    { retries: 30, minTimeout: 2000, factor: 1 }
  );

  await esClient.cluster.health({
    index: namePattern,
    wait_for_status: 'yellow',
    timeout: '60s',
  });
};

export function getSupertestWithAdminUser(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`);
  return getSupertest(root, method, path).set(
    'Authorization',
    `Basic ${testUserCredentials.toString('base64')}`
  );
}
