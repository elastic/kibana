/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getConnectorType } from '../../fixtures';
import { ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG } from '../../../common';
import { CATALOG_FIRST_LOAD_TIMEOUT_MS } from './constants';
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
  const featureFlags = { getBooleanValue$: jest.fn() };
  const storage: jest.Mocked<
    Pick<ConnectorCatalogStorage, 'ensureIndex' | 'getManifest' | 'getDefinitions'>
  > = {
    ensureIndex: jest.fn(),
    getManifest: jest.fn(),
    getDefinitions: jest.fn(),
  };
  const actionTypeRegistry = { has: jest.fn(), register: jest.fn() };
  const buildType = jest.fn();

  const startWithHandle = (timeoutMs?: number) =>
    startConnectorCatalog({
      featureFlags,
      storage,
      actionTypeRegistry,
      buildType,
      logger,
      timeoutMs,
    });

  const start = (timeoutMs?: number) => startWithHandle(timeoutMs).ready;

  beforeEach(() => {
    jest.resetAllMocks();
    featureFlags.getBooleanValue$.mockReturnValue(of(true));
    storage.ensureIndex.mockResolvedValue(undefined);
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

  it('reads the flag with the catalog key and a false fallback', async () => {
    await start();

    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG,
      false
    );
  });

  it('calls no storage method when the flag is off', async () => {
    featureFlags.getBooleanValue$.mockReturnValue(of(false));

    await start();

    expect(storage.ensureIndex).not.toHaveBeenCalled();
    expect(storage.getManifest).not.toHaveBeenCalled();
    expect(storage.getDefinitions).not.toHaveBeenCalled();
    expect(actionTypeRegistry.register).not.toHaveBeenCalled();
  });

  it('creates the index, then loads and logs the count at info', async () => {
    await start();

    expect(storage.ensureIndex).toHaveBeenCalledTimes(1);
    expect(storage.ensureIndex.mock.invocationCallOrder[0]).toBeLessThan(
      storage.getManifest.mock.invocationCallOrder[0]
    );
    expect(actionTypeRegistry.register).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs at warn and resolves when the index create fails, without reading', async () => {
    storage.ensureIndex.mockRejectedValue(new Error('create failed'));

    await expect(start()).resolves.toBeUndefined();

    expect(storage.getManifest).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('create failed'));
  });

  it('logs at warn and resolves when a read is rejected', async () => {
    storage.getManifest.mockRejectedValue(new Error('read failed'));

    await expect(start()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('read failed'));
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs at warn and resolves when the flag read is rejected', async () => {
    featureFlags.getBooleanValue$.mockReturnValue(throwError(() => new Error('flag failed')));

    await expect(start()).resolves.toBeUndefined();

    expect(storage.ensureIndex).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('flag failed'));
  });

  describe('flag changes', () => {
    it('loads once when the flag turns on after the first emission was off', async () => {
      const flag$ = new BehaviorSubject(false);
      featureFlags.getBooleanValue$.mockReturnValue(flag$);

      const { ready } = startWithHandle();
      await ready;
      expect(storage.ensureIndex).not.toHaveBeenCalled();

      flag$.next(true);
      await new Promise(process.nextTick);
      expect(storage.ensureIndex).toHaveBeenCalledTimes(1);
      expect(actionTypeRegistry.register).toHaveBeenCalledTimes(1);

      flag$.next(false);
      flag$.next(true);
      await new Promise(process.nextTick);
      expect(storage.ensureIndex).toHaveBeenCalledTimes(1);
    });

    it('does not load after stop', async () => {
      const flag$ = new BehaviorSubject(false);
      featureFlags.getBooleanValue$.mockReturnValue(flag$);

      const { ready, stop } = startWithHandle();
      await ready;
      stop();
      flag$.next(true);
      await new Promise(process.nextTick);

      expect(storage.ensureIndex).not.toHaveBeenCalled();
    });

    it('resolves ready at the timeout when the flag never emits', async () => {
      jest.useFakeTimers();
      featureFlags.getBooleanValue$.mockReturnValue(new Subject<boolean>());
      const onResolved = jest.fn();

      const promise = start(1000).then(onResolved);
      await jest.advanceTimersByTimeAsync(999);
      expect(onResolved).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await promise;

      expect(onResolved).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('flag'));
      expect(storage.ensureIndex).not.toHaveBeenCalled();
    });
  });

  describe('timeout', () => {
    it('resolves at the timeout with a warn log when a read never ends', async () => {
      jest.useFakeTimers();
      storage.getManifest.mockReturnValue(new Promise(() => {}));
      const onResolved = jest.fn();

      const promise = start().then(onResolved);
      await jest.advanceTimersByTimeAsync(CATALOG_FIRST_LOAD_TIMEOUT_MS - 1);
      expect(onResolved).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await promise;

      expect(onResolved).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    });

    it('passes an abort signal that aborts at the timeout', async () => {
      jest.useFakeTimers();
      storage.getManifest.mockReturnValue(new Promise(() => {}));

      const promise = start(1000);
      await jest.advanceTimersByTimeAsync(1000);
      await promise;

      const [{ signal }] = storage.getManifest.mock.calls[0] as [{ signal: AbortSignal }];
      expect(signal.aborted).toBe(true);
    });

    it('registers nothing when the result arrives after the timeout', async () => {
      jest.useFakeTimers();
      let resolveManifest: (value: typeof manifest) => void = () => {};
      storage.getManifest.mockReturnValue(
        new Promise((resolve) => {
          resolveManifest = resolve;
        })
      );

      const promise = start(1000);
      await jest.advanceTimersByTimeAsync(1000);
      await promise;
      resolveManifest(manifest);
      await jest.advanceTimersByTimeAsync(0);

      expect(actionTypeRegistry.register).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('clears the timer when the load ends before the timeout', async () => {
      jest.useFakeTimers();

      await start();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
