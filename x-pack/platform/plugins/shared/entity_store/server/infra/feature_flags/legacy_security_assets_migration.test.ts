/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, of } from 'rxjs';
import type { CoreStart, FeatureFlagsStart } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../../../common';
import {
  getLegacySecurityAssetsMigrationFlag,
  subscribeToLegacySecurityAssetsMigrationFlag,
} from './legacy_security_assets_migration';

describe('getLegacySecurityAssetsMigrationFlag', () => {
  it('resolves with the current value without waiting for it to become true', async () => {
    const getBooleanValue$ = jest.fn().mockReturnValue(of(false));
    const featureFlags = { getBooleanValue$ } as unknown as FeatureFlagsStart;

    await expect(getLegacySecurityAssetsMigrationFlag(featureFlags)).resolves.toBe(false);
    expect(getBooleanValue$).toHaveBeenCalledWith(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false);
  });

  it('resolves true when the feature flag is enabled', async () => {
    const getBooleanValue$ = jest.fn().mockReturnValue(of(true));
    const featureFlags = { getBooleanValue$ } as unknown as FeatureFlagsStart;

    await expect(getLegacySecurityAssetsMigrationFlag(featureFlags)).resolves.toBe(true);
  });
});

describe('subscribeToLegacySecurityAssetsMigrationFlag', () => {
  let flag$: Subject<boolean>;
  let stop$: Subject<void>;
  let scheduleMigration: jest.Mock<Promise<void>, []>;
  let logger: ReturnType<typeof loggerMock.create>;

  const subscribe = () =>
    subscribeToLegacySecurityAssetsMigrationFlag({
      coreStart: {
        featureFlags: {
          getBooleanValue$: jest.fn().mockReturnValue(flag$.asObservable()),
        },
      } as unknown as CoreStart,
      logger,
      stop$,
      scheduleMigration,
    });

  beforeEach(() => {
    flag$ = new Subject<boolean>();
    stop$ = new Subject<void>();
    scheduleMigration = jest.fn().mockResolvedValue(undefined);
    logger = loggerMock.create();
  });

  afterEach(() => {
    stop$.next();
    stop$.complete();
  });

  it('schedules the migration when the flag becomes enabled', async () => {
    subscribe();

    flag$.next(false);
    flag$.next(true);
    await flushPromises();

    expect(scheduleMigration).toHaveBeenCalledTimes(1);
  });

  it('serializes repeated enabled emissions', async () => {
    let resolveFirstMigration: (() => void) | undefined;
    scheduleMigration
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstMigration = resolve;
          })
      )
      .mockResolvedValueOnce();
    subscribe();

    flag$.next(true);
    flag$.next(false);
    flag$.next(true);
    await flushPromises();

    expect(scheduleMigration).toHaveBeenCalledTimes(1);

    resolveFirstMigration?.();
    await flushPromises();

    expect(scheduleMigration).toHaveBeenCalledTimes(2);
  });

  it('stops responding to flag updates when the plugin stops', async () => {
    subscribe();

    stop$.next();
    flag$.next(true);
    await flushPromises();

    expect(scheduleMigration).not.toHaveBeenCalled();
  });

  it('discards a queued migration when the plugin stops', async () => {
    let resolveFirstMigration: (() => void) | undefined;
    scheduleMigration
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstMigration = resolve;
          })
      )
      .mockResolvedValueOnce(undefined);
    subscribe();

    flag$.next(true);
    flag$.next(false);
    flag$.next(true);
    await flushPromises();

    stop$.next();
    resolveFirstMigration?.();
    await flushPromises();

    expect(scheduleMigration).toHaveBeenCalledTimes(1);
  });
});

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
