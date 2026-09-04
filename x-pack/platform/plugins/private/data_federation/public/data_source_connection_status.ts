/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiHealthProps } from '@elastic/eui';

export type DataSourceConnectionStatus = 'connected' | 'broken';

/**
 * Temporary mock until the backend exposes connection health for data sources.
 */
export const getMockDataSourceConnectionStatus = (
  dataSourceName: string
): DataSourceConnectionStatus => {
  let hash = 0;

  for (const char of dataSourceName) {
    hash = (hash + char.charCodeAt(0)) % 5;
  }

  return hash === 0 ? 'broken' : 'connected';
};

export const getDataSourceConnectionStatusColor = (
  status: DataSourceConnectionStatus
): EuiHealthProps['color'] => (status === 'connected' ? 'success' : 'danger');

/** How long the mock check pretends to talk to the data source. */
export const MOCK_CONNECTION_CHECK_DELAY_MS = 2000;

/** Share of mock checks that come back connected, so the happy path dominates. */
const MOCK_CONNECTION_CHECK_SUCCESS_RATE = 0.8;

/**
 * Temporary mock until Elasticsearch can check a data source connection for us. Unlike
 * {@link getMockDataSourceConnectionStatus} the result is random, so re-checking a data
 * source can change its status.
 */
export const runMockDataSourceConnectionCheck = (): Promise<DataSourceConnectionStatus> =>
  new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(Math.random() < MOCK_CONNECTION_CHECK_SUCCESS_RATE ? 'connected' : 'broken');
    }, MOCK_CONNECTION_CHECK_DELAY_MS);
  });
