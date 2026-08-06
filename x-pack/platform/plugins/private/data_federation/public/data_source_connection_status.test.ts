/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDataSourceConnectionStatusColor,
  getMockDataSourceConnectionStatus,
} from './data_source_connection_status';

describe('data_source_connection_status', () => {
  it('returns a stable mock status for a data source name', () => {
    expect(getMockDataSourceConnectionStatus('obs-prod-s3')).toBe('connected');
    expect(getMockDataSourceConnectionStatus('obs-prod-s3')).toBe('connected');
  });

  it('returns broken for names that hash to zero', () => {
    expect(getMockDataSourceConnectionStatus('source-b')).toBe('broken');
  });

  it('maps status values to health colors', () => {
    expect(getDataSourceConnectionStatusColor('connected')).toBe('success');
    expect(getDataSourceConnectionStatusColor('broken')).toBe('danger');
  });
});
