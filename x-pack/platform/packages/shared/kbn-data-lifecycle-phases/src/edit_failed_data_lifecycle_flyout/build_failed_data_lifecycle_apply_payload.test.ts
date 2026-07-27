/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFailedDataLifecycleApplyPayload } from './types';

describe('buildFailedDataLifecycleApplyPayload', () => {
  it('returns inherit payload when inheritLifecycle is true', () => {
    expect(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle: true,
        failureStoreEnabled: true,
        retention: '60d',
      })
    ).toEqual({ inheritLifecycle: true });

    expect(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle: true,
        failureStoreEnabled: false,
      })
    ).toEqual({ inheritLifecycle: true });
  });

  it('returns failure store payload when not inheriting (no retention)', () => {
    expect(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle: false,
        failureStoreEnabled: true,
      })
    ).toEqual({ inheritLifecycle: false, failureStoreEnabled: true });

    expect(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle: false,
        failureStoreEnabled: false,
        retention: '60d',
      })
    ).toEqual({ inheritLifecycle: false, failureStoreEnabled: false });
  });

  it('includes trimmed retention when failure store is enabled', () => {
    expect(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle: false,
        failureStoreEnabled: true,
        retention: ' 60d ',
      })
    ).toEqual({ inheritLifecycle: false, failureStoreEnabled: true, retention: '60d' });

    expect(
      buildFailedDataLifecycleApplyPayload({
        inheritLifecycle: false,
        failureStoreEnabled: true,
        retention: '   ',
      })
    ).toEqual({ inheritLifecycle: false, failureStoreEnabled: true });
  });
});
