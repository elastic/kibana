/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDataLifecycleApplyPayload } from './types';

describe('buildDataLifecycleApplyPayload', () => {
  it('returns inherit payload when inheritLifecycle is true', () => {
    expect(
      buildDataLifecycleApplyPayload({
        inheritLifecycle: true,
        method: 'ilm',
        ilmPolicyName: 'policy-a',
      })
    ).toEqual({ inheritLifecycle: true });

    expect(
      buildDataLifecycleApplyPayload({
        inheritLifecycle: true,
        method: 'dlm',
      })
    ).toEqual({ inheritLifecycle: true });
  });

  it('returns DLM payload when not inheriting and method is dlm', () => {
    expect(
      buildDataLifecycleApplyPayload({
        inheritLifecycle: false,
        method: 'dlm',
      })
    ).toEqual({
      inheritLifecycle: false,
      method: 'dlm',
      frozenAfter: undefined,
      dataRetention: undefined,
    });
  });

  it('returns DLM payload with phase durations when provided', () => {
    expect(
      buildDataLifecycleApplyPayload({
        inheritLifecycle: false,
        method: 'dlm',
        frozenAfter: '30d',
        dataRetention: '60d',
      })
    ).toEqual({ inheritLifecycle: false, method: 'dlm', frozenAfter: '30d', dataRetention: '60d' });
  });

  it('returns undefined when not inheriting and method is ilm without a policy name', () => {
    expect(
      buildDataLifecycleApplyPayload({
        inheritLifecycle: false,
        method: 'ilm',
        ilmPolicyName: undefined,
      })
    ).toBeUndefined();
  });

  it('returns ILM payload when not inheriting and method is ilm with a policy name', () => {
    expect(
      buildDataLifecycleApplyPayload({
        inheritLifecycle: false,
        method: 'ilm',
        ilmPolicyName: 'policy-a',
      })
    ).toEqual({ inheritLifecycle: false, method: 'ilm', ilmPolicyName: 'policy-a' });
  });
});
