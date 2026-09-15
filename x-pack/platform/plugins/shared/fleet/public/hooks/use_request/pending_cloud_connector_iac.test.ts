/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasPendingIacConfirm,
  persistPendingCloudConnectorIac,
  setPendingCloudConnectorIac,
  takePendingCloudConnectorIac,
} from './pending_cloud_connector_iac';
import { sendUpdateCloudConnector } from './cloud_connector';

jest.mock('./cloud_connector', () => ({
  sendUpdateCloudConnector: jest.fn(),
}));

const mockedSendUpdateCloudConnector = jest.mocked(sendUpdateCloudConnector);

describe('pending cloud connector IaC', () => {
  afterEach(() => {
    takePendingCloudConnectorIac('test-policy');
    jest.clearAllMocks();
  });

  it('stores and takes IaC for a policy name', () => {
    setPendingCloudConnectorIac('test-policy', {
      iac_key: 'sha256:abc',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: 'v1',
    });

    expect(takePendingCloudConnectorIac('test-policy')).toEqual({
      iac_key: 'sha256:abc',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: 'v1',
    });
    expect(takePendingCloudConnectorIac('test-policy')).toBeUndefined();
  });

  it('does not return IaC stored under a different policy name', () => {
    setPendingCloudConnectorIac('other-policy', { iac_key: 'sha256:abc' });

    expect(takePendingCloudConnectorIac('test-policy')).toBeUndefined();
    expect(takePendingCloudConnectorIac('other-policy')).toEqual({ iac_key: 'sha256:abc' });
  });

  it('treats a null digest as confirm state', () => {
    expect(hasPendingIacConfirm({ iac_key: null })).toBe(true);
    expect(hasPendingIacConfirm({})).toBe(false);
  });

  it('writes pending IaC onto the connector after a successful save', async () => {
    mockedSendUpdateCloudConnector.mockResolvedValue({ data: {} as any, error: null });
    setPendingCloudConnectorIac('test-policy', {
      iac_key: 'sha256:abc',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: 'v1',
    });

    await persistPendingCloudConnectorIac({
      policyName: 'test-policy',
      cloudConnectorId: 'connector-1',
    });

    expect(mockedSendUpdateCloudConnector).toHaveBeenCalledWith('connector-1', {
      iac_key: 'sha256:abc',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: 'v1',
    });
    expect(takePendingCloudConnectorIac('test-policy')).toBeUndefined();
  });

  it('skips the connector write when nothing is pending or no connector id is returned', async () => {
    mockedSendUpdateCloudConnector.mockResolvedValue({ data: {} as any, error: null });
    setPendingCloudConnectorIac('test-policy', { iac_key: 'sha256:abc' });

    await persistPendingCloudConnectorIac({
      policyName: 'test-policy',
      cloudConnectorId: undefined,
    });
    expect(mockedSendUpdateCloudConnector).not.toHaveBeenCalled();
    expect(takePendingCloudConnectorIac('test-policy')).toEqual({ iac_key: 'sha256:abc' });

    await persistPendingCloudConnectorIac({
      policyName: 'missing-policy',
      cloudConnectorId: 'connector-1',
    });
    expect(mockedSendUpdateCloudConnector).not.toHaveBeenCalled();
  });

  it('keeps pending IaC when the connector update returns an error', async () => {
    const pending = {
      iac_key: 'sha256:abc',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: 'v1',
    };
    mockedSendUpdateCloudConnector.mockResolvedValue({
      data: null,
      error: new Error('update failed'),
    });
    setPendingCloudConnectorIac('test-policy', pending);

    await expect(
      persistPendingCloudConnectorIac({
        policyName: 'test-policy',
        cloudConnectorId: 'connector-1',
      })
    ).resolves.toBeUndefined();

    expect(takePendingCloudConnectorIac('test-policy')).toEqual(pending);
  });

  it('keeps pending IaC when the connector update throws', async () => {
    const pending = { iac_key: 'sha256:abc' };
    mockedSendUpdateCloudConnector.mockRejectedValue(new Error('network down'));
    setPendingCloudConnectorIac('test-policy', pending);

    await expect(
      persistPendingCloudConnectorIac({
        policyName: 'test-policy',
        cloudConnectorId: 'connector-1',
      })
    ).resolves.toBeUndefined();

    expect(takePendingCloudConnectorIac('test-policy')).toEqual(pending);
  });
});
