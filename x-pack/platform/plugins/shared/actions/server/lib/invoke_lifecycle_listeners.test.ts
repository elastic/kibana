/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConnectorLifecycleListener } from '../types';
import { invokePostCreateListeners, invokePostDeleteListeners } from './invoke_lifecycle_listeners';

describe('invokePostCreateListeners', () => {
  const logger = loggingSystemMock.create().get();
  const baseParams = {
    connectorId: 'conn-1',
    connectorName: 'Test Connector',
    config: {},
    logger,
    request: {} as unknown as Parameters<
      NonNullable<ConnectorLifecycleListener['onPostCreate']>
    >[0]['request'],
    services: {
      scopedClusterClient: {} as unknown as Parameters<
        NonNullable<ConnectorLifecycleListener['onPostCreate']>
      >[0]['services']['scopedClusterClient'],
    },
    wasSuccessful: true,
    workflowTemplates: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not throw when listeners is undefined', async () => {
    await expect(
      invokePostCreateListeners(undefined, '.test', baseParams, logger)
    ).resolves.not.toThrow();
  });

  it('does not throw when listeners is empty', async () => {
    await expect(invokePostCreateListeners([], '.test', baseParams, logger)).resolves.not.toThrow();
  });

  it('invokes onPostCreate for matching wildcard listener', async () => {
    const onPostCreate = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostCreate }];

    await invokePostCreateListeners(listeners, '.slack2', baseParams, logger);

    expect(onPostCreate).toHaveBeenCalledWith({ ...baseParams, connectorType: '.slack2' });
  });

  it('invokes onPostCreate for matching specific type', async () => {
    const onPostCreate = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: ['.slack2'], onPostCreate }];

    await invokePostCreateListeners(listeners, '.slack2', baseParams, logger);

    expect(onPostCreate).toHaveBeenCalledTimes(1);
  });

  it('skips listeners that do not match the connector type', async () => {
    const onPostCreate = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: ['.github'], onPostCreate }];

    await invokePostCreateListeners(listeners, '.slack2', baseParams, logger);

    expect(onPostCreate).not.toHaveBeenCalled();
  });

  it('logs error but does not throw when a listener throws', async () => {
    const onPostCreate = jest.fn().mockRejectedValue(new Error('listener failure'));
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostCreate }];

    await expect(
      invokePostCreateListeners(listeners, '.test', baseParams, logger)
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('listener failure'));
  });

  it('continues invoking remaining listeners after one fails', async () => {
    const failingHook = jest.fn().mockRejectedValue(new Error('fail'));
    const succeedingHook = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [
      { connectorTypes: '*', onPostCreate: failingHook },
      { connectorTypes: '*', onPostCreate: succeedingHook },
    ];

    await invokePostCreateListeners(listeners, '.test', baseParams, logger);

    expect(failingHook).toHaveBeenCalled();
    expect(succeedingHook).toHaveBeenCalled();
  });
});

describe('invokePostDeleteListeners', () => {
  const logger = loggingSystemMock.create().get();
  const baseParams = {
    connectorId: 'conn-1',
    config: {},
    logger,
    request: {} as unknown as Parameters<
      NonNullable<ConnectorLifecycleListener['onPostDelete']>
    >[0]['request'],
    services: {
      scopedClusterClient: {} as unknown as Parameters<
        NonNullable<ConnectorLifecycleListener['onPostDelete']>
      >[0]['services']['scopedClusterClient'],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not throw when listeners is undefined', async () => {
    await expect(
      invokePostDeleteListeners(undefined, '.test', baseParams, logger)
    ).resolves.not.toThrow();
  });

  it('invokes onPostDelete for matching wildcard listener', async () => {
    const onPostDelete = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostDelete }];

    await invokePostDeleteListeners(listeners, '.slack2', baseParams, logger);

    expect(onPostDelete).toHaveBeenCalledWith({ ...baseParams, connectorType: '.slack2' });
  });

  it('skips listeners without onPostDelete hook', async () => {
    const onPostCreate = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostCreate }];

    await invokePostDeleteListeners(listeners, '.slack2', baseParams, logger);

    expect(onPostCreate).not.toHaveBeenCalled();
  });
});
