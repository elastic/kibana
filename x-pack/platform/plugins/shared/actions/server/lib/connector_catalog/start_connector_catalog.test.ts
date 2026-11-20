/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getConnectorType } from '../../fixtures';
import { CATALOG_START_LOAD_TIMEOUT_MS } from './constants';
import { startConnectorCatalog } from './start_connector_catalog';
import type { ConnectorCatalogStorage, StoredCatalogDefinition } from './types';

const definition: StoredCatalogDefinition = {
  connectorId: '.catalog-test',
  version: '1.0.0',
  yaml: 'id: .catalog-test',
  contentHash: 'sha256:abc',
  catalogVersion: '2026.11.1',
};

const manifest = {
  raw: JSON.stringify({ connectors: [{ id: '.catalog-test', version: '1.0.0' }] }),
};

describe('startConnectorCatalog', () => {
  const logger = loggingSystemMock.createLogger();
  const storage: jest.Mocked<Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>> = {
    getManifest: jest.fn(),
    getDefinitions: jest.fn(),
  };
  const actionTypeRegistry = { has: jest.fn(), register: jest.fn() };
  const buildType = jest.fn();

  const startCatalog = (overrides: Partial<Parameters<typeof startConnectorCatalog>[0]> = {}) =>
    startConnectorCatalog({
      isEnabled: true,
      storage,
      actionTypeRegistry,
      buildType,
      logger,
      ...overrides,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    storage.getManifest.mockResolvedValue(manifest);
    storage.getDefinitions.mockResolvedValue([definition]);
    actionTypeRegistry.has.mockReturnValue(false);
    buildType.mockReturnValue(
      getConnectorType({
        id: '.catalog-test',
        name: 'Catalog test',
        minimumLicenseRequired: 'enterprise',
      })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls no storage method and registers nothing when the config is off', async () => {
    const { ready } = startCatalog({ isEnabled: false });

    await expect(ready).resolves.toBeUndefined();

    expect(storage.getManifest).not.toHaveBeenCalled();
    expect(storage.getDefinitions).not.toHaveBeenCalled();
    expect(actionTypeRegistry.register).not.toHaveBeenCalled();
  });

  it('loads and logs the count at info', async () => {
    await startCatalog().ready;

    expect(storage.getManifest).toHaveBeenCalledTimes(1);
    expect(actionTypeRegistry.register).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/^Registered 1 connector type\(s\) from the connector catalog\.$/)
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('never calls a write method of the storage', async () => {
    const writableStorage = {
      ...storage,
      createDefinition: jest.fn(),
      createAsset: jest.fn(),
      replaceManifest: jest.fn(),
    };
    storage.getManifest.mockResolvedValue(undefined);
    const handle = startConnectorCatalog({
      isEnabled: true,
      storage: writableStorage,
      actionTypeRegistry,
      buildType,
      logger,
    });
    await handle.ready;

    expect(writableStorage.createDefinition).not.toHaveBeenCalled();
    expect(writableStorage.createAsset).not.toHaveBeenCalled();
    expect(writableStorage.replaceManifest).not.toHaveBeenCalled();
    expect(actionTypeRegistry.register).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs at warn and resolves when a read is rejected', async () => {
    storage.getManifest.mockRejectedValue(new Error('read failed'));

    await expect(startCatalog().ready).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('read failed'));
    expect(logger.info).not.toHaveBeenCalled();
  });

  describe('timeout', () => {
    it('resolves at the timeout with a warn log when a read never ends', async () => {
      jest.useFakeTimers();
      storage.getManifest.mockReturnValue(new Promise(() => {}));
      const onResolved = jest.fn();

      const promise = startCatalog().ready.then(onResolved);
      await jest.advanceTimersByTimeAsync(CATALOG_START_LOAD_TIMEOUT_MS - 1);
      expect(onResolved).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await promise;

      expect(onResolved).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    });

    it('passes an abort signal that aborts at the timeout', async () => {
      jest.useFakeTimers();
      storage.getManifest.mockReturnValue(new Promise(() => {}));

      const promise = startCatalog({ timeoutMs: 1000 }).ready;
      await jest.advanceTimersByTimeAsync(1000);
      await promise;

      const [{ signal }] = storage.getManifest.mock.calls[0] as [{ signal: AbortSignal }];
      expect(signal.aborted).toBe(true);
    });

    it('registers nothing when the ES read ends after the timeout', async () => {
      jest.useFakeTimers();
      let resolveManifest: (value: typeof manifest) => void = () => {};
      storage.getManifest.mockReturnValue(
        new Promise((resolve) => {
          resolveManifest = resolve;
        })
      );

      const promise = startCatalog({ timeoutMs: 1000 }).ready;
      await jest.advanceTimersByTimeAsync(1000);
      await promise;
      resolveManifest(manifest);
      await jest.advanceTimersByTimeAsync(0);

      expect(storage.getDefinitions).not.toHaveBeenCalled();
      expect(actionTypeRegistry.register).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('clears the timer when the load ends before the timeout', async () => {
      jest.useFakeTimers();

      await startCatalog().ready;

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('stop()', () => {
    it('aborts a running load without warn or info logs', async () => {
      jest.useFakeTimers();
      storage.getManifest.mockReturnValue(new Promise(() => {}));
      const { ready, stop } = startCatalog();

      await jest.advanceTimersByTimeAsync(0);
      expect(storage.getManifest).toHaveBeenCalledTimes(1);

      stop();
      await ready;

      const [{ signal }] = storage.getManifest.mock.calls[0] as [{ signal: AbortSignal }];
      expect(signal.aborted).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(actionTypeRegistry.register).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
