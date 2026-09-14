/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasPendingIacConfirm,
  setPendingCloudConnectorIac,
  takePendingCloudConnectorIac,
} from './pending_cloud_connector_iac';

describe('pending cloud connector IaC', () => {
  afterEach(() => {
    takePendingCloudConnectorIac('test-policy');
  });

  it('stores and takes IaC for a policy name', () => {
    setPendingCloudConnectorIac('test-policy', {
      templateSha: 'sha256:abc',
      blueprintId: 'federated-identity',
      blueprintVersion: 'v1',
    });

    expect(takePendingCloudConnectorIac('test-policy')).toEqual({
      templateSha: 'sha256:abc',
      blueprintId: 'federated-identity',
      blueprintVersion: 'v1',
    });
    expect(takePendingCloudConnectorIac('test-policy')).toBeUndefined();
  });

  it('does not return IaC stored under a different policy name', () => {
    setPendingCloudConnectorIac('other-policy', { templateSha: 'sha256:abc' });

    expect(takePendingCloudConnectorIac('test-policy')).toBeUndefined();
    expect(takePendingCloudConnectorIac('other-policy')).toEqual({ templateSha: 'sha256:abc' });
  });

  it('treats a null digest as confirm state', () => {
    expect(hasPendingIacConfirm({ templateSha: null })).toBe(true);
    expect(hasPendingIacConfirm({})).toBe(false);
  });
});
