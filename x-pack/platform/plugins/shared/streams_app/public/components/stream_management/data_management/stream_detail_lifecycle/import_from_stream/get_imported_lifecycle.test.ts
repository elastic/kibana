/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyForFlyout } from '@kbn/data-lifecycle-phases';
import { getImportedLifecycle, sourceHasDownsampling } from './get_imported_lifecycle';

describe('getImportedLifecycle', () => {
  it('applies an ILM source as an ILM policy', () => {
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { ilm: { policy: 'my-policy' } },
        targetIsTimeSeries: false,
      })
    ).toEqual({ ilm: { policy: 'my-policy' } });
  });

  it('keeps ILM policy references unchanged for non-time-series targets', () => {
    // The ILM path always returns the policy reference unchanged, even for
    // non-time-series targets where any downsampling steps have no effect.
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { ilm: { policy: 'policy-with-downsampling' } },
        targetIsTimeSeries: false,
      })
    ).toEqual({ ilm: { policy: 'policy-with-downsampling' } });
  });

  it('applies a DSL source as an explicit custom retention', () => {
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { dsl: { data_retention: '30d' } },
        targetIsTimeSeries: false,
      })
    ).toEqual({ dsl: { data_retention: '30d' } });
  });

  it('copies frozen_after but drops downsampling when target is not a time series', () => {
    expect(
      getImportedLifecycle({
        effectiveLifecycle: {
          dsl: {
            data_retention: '90d',
            frozen_after: '30d',
            downsample: [{ after: '7d', fixed_interval: '1h' }],
          },
        },
        targetIsTimeSeries: false,
      })
    ).toEqual({ dsl: { data_retention: '90d', frozen_after: '30d' } });
  });

  it('keeps downsampling when target is a time series', () => {
    const downsample = [{ after: '7d', fixed_interval: '1h' }];
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { dsl: { data_retention: '90d', downsample } },
        targetIsTimeSeries: true,
      })
    ).toEqual({ dsl: { data_retention: '90d', downsample } });
  });

  it('returns an empty dsl for an indefinite DSL source', () => {
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { dsl: {} },
        targetIsTimeSeries: true,
      })
    ).toEqual({ dsl: {} });
  });

  it('returns null for error lifecycles', () => {
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { error: { message: 'boom' } },
        targetIsTimeSeries: true,
      })
    ).toBeNull();
  });

  it('returns null for disabled lifecycles', () => {
    expect(
      getImportedLifecycle({
        effectiveLifecycle: { disabled: {} },
        targetIsTimeSeries: true,
      })
    ).toBeNull();
  });
});

describe('sourceHasDownsampling', () => {
  const policyWithDownsample: IlmPolicyForFlyout = {
    name: 'downsample-policy',
    phases: { hot: { actions: { downsample: { fixed_interval: '1h' } } } },
  };
  const policyWithoutDownsample: IlmPolicyForFlyout = {
    name: 'plain-policy',
    phases: { hot: {}, delete: { min_age: '30d', actions: { delete: {} } } },
  };
  const ilmPoliciesByName = new Map<string, IlmPolicyForFlyout>([
    [policyWithDownsample.name, policyWithDownsample],
    [policyWithoutDownsample.name, policyWithoutDownsample],
  ]);

  it('detects downsampling on a DSL source', () => {
    expect(
      sourceHasDownsampling({
        effectiveLifecycle: { dsl: { downsample: [{ after: '7d', fixed_interval: '1h' }] } },
        ilmPoliciesByName,
      })
    ).toBe(true);
  });

  it('returns false for a DSL source without downsampling', () => {
    expect(
      sourceHasDownsampling({
        effectiveLifecycle: { dsl: { data_retention: '30d' } },
        ilmPoliciesByName,
      })
    ).toBe(false);
  });

  it('detects downsampling on an ILM source', () => {
    expect(
      sourceHasDownsampling({
        effectiveLifecycle: { ilm: { policy: 'downsample-policy' } },
        ilmPoliciesByName,
      })
    ).toBe(true);
  });

  it('returns false for an ILM source whose policy has no downsampling', () => {
    expect(
      sourceHasDownsampling({
        effectiveLifecycle: { ilm: { policy: 'plain-policy' } },
        ilmPoliciesByName,
      })
    ).toBe(false);
  });

  it('returns false when the ILM policy details are unavailable', () => {
    expect(
      sourceHasDownsampling({
        effectiveLifecycle: { ilm: { policy: 'unknown-policy' } },
        ilmPoliciesByName,
      })
    ).toBe(false);
  });
});
