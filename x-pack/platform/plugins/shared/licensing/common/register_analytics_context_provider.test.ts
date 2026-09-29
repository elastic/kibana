/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { Subject } from 'rxjs';
import { firstValueFrom, ReplaySubject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';

describe('registerAnalyticsContextProvider', () => {
  const analyticsClientMock = {
    registerContextProvider: vi.fn(),
  };

  let license$: Subject<ILicense>;

  beforeEach(() => {
    vi.clearAllMocks();
    license$ = new ReplaySubject<ILicense>(1);
    registerAnalyticsContextProvider(analyticsClientMock, license$);
  });

  test('should register the analytics context provider', () => {
    expect(analyticsClientMock.registerContextProvider).toHaveBeenCalledTimes(1);
  });

  test('emits a context value the moment license emits', async () => {
    license$.next({
      uid: 'uid',
      status: 'active',
      isActive: true,
      type: 'basic',
      signature: 'signature',
      isAvailable: true,
      toJSON: vi.fn(),
      getUnavailableReason: vi.fn(),
      hasAtLeast: vi.fn(),
      check: vi.fn(),
      getFeature: vi.fn(),
    });
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[0][0].context$)
    ).resolves.toEqual({
      license_id: 'uid',
      license_status: 'active',
      license_type: 'basic',
    });
  });
});
