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
