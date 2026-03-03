/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConnectorLifecycleListener } from '../types';
import { invokeLifecycleListeners } from './invoke_lifecycle_listeners';

describe('invokeLifecycleListeners', () => {
  const logger = loggingSystemMock.create().get();
  const baseParams = {
    connectorId: 'conn-1',
    config: {},
    secrets: {},
    logger,
    request: {} as unknown as Parameters<
      NonNullable<ConnectorLifecycleListener['onPostSave']>
    >[0]['request'],
    services: {
      scopedClusterClient: {} as unknown as Parameters<
        NonNullable<ConnectorLifecycleListener['onPostSave']>
      >[0]['services']['scopedClusterClient'],
    },
    isUpdate: false,
    wasSuccessful: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when listeners is undefined', async () => {
    await invokeLifecycleListeners(undefined, 'onPostSave', '.test', baseParams, logger);
  });

  it('does nothing when listeners is empty', async () => {
    await invokeLifecycleListeners([], 'onPostSave', '.test', baseParams, logger);
  });

  it('invokes onPostSave for matching wildcard listener', async () => {
    const onPostSave = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostSave }];

    await invokeLifecycleListeners(listeners, 'onPostSave', '.slack2', baseParams, logger);

    expect(onPostSave).toHaveBeenCalledWith({ ...baseParams, connectorType: '.slack2' });
  });

  it('invokes onPostSave for matching specific type', async () => {
    const onPostSave = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: ['.slack2'], onPostSave }];

    await invokeLifecycleListeners(listeners, 'onPostSave', '.slack2', baseParams, logger);

    expect(onPostSave).toHaveBeenCalledTimes(1);
  });

  it('skips listeners that do not match the connector type', async () => {
    const onPostSave = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: ['.github'], onPostSave }];

    await invokeLifecycleListeners(listeners, 'onPostSave', '.slack2', baseParams, logger);

    expect(onPostSave).not.toHaveBeenCalled();
  });

  it('skips listeners that do not have the requested hook', async () => {
    const onPostSave = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostSave }];

    await invokeLifecycleListeners(listeners, 'onPostDelete', '.slack2', baseParams, logger);

    expect(onPostSave).not.toHaveBeenCalled();
  });

  it('logs error but does not throw when a listener throws', async () => {
    const onPostSave = jest.fn().mockRejectedValue(new Error('listener failure'));
    const listeners: ConnectorLifecycleListener[] = [{ connectorTypes: '*', onPostSave }];

    await expect(
      invokeLifecycleListeners(listeners, 'onPostSave', '.test', baseParams, logger)
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('listener failure'));
  });

  it('continues invoking remaining listeners after one fails', async () => {
    const failingHook = jest.fn().mockRejectedValue(new Error('fail'));
    const succeedingHook = jest.fn();
    const listeners: ConnectorLifecycleListener[] = [
      { connectorTypes: '*', onPostSave: failingHook },
      { connectorTypes: '*', onPostSave: succeedingHook },
    ];

    await invokeLifecycleListeners(listeners, 'onPostSave', '.test', baseParams, logger);

    expect(failingHook).toHaveBeenCalled();
    expect(succeedingHook).toHaveBeenCalled();
  });
});
