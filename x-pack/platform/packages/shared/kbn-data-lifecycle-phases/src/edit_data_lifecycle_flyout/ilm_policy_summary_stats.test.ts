/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyForFlyout } from './types';
import { getIlmPolicySummaryStats } from './ilm_policy_summary_stats';

describe('getIlmPolicySummaryStats', () => {
  it('computes phaseCount excluding the delete phase', () => {
    const phases: IlmPolicyForFlyout['phases'] = {
      hot: { actions: {} },
      warm: { actions: {} },
      delete: { min_age: '30d', actions: { delete: {} } },
    };

    expect(getIlmPolicySummaryStats(phases)).toEqual({
      deleteAfter: '30d',
      phaseCount: 2,
      downsampleStepCount: 0,
    });
  });

  it('returns null deleteAfter when delete phase is missing min_age or delete action', () => {
    const phasesMissingAction: IlmPolicyForFlyout['phases'] = {
      hot: { actions: {} },
      delete: { min_age: '30d', actions: {} },
    };

    const phasesMissingAge: IlmPolicyForFlyout['phases'] = {
      hot: { actions: {} },
      delete: { actions: { delete: {} } },
    };

    expect(getIlmPolicySummaryStats(phasesMissingAction).deleteAfter).toBeNull();
    expect(getIlmPolicySummaryStats(phasesMissingAge).deleteAfter).toBeNull();
  });

  it('counts downsample steps across hot, warm, and cold phases', () => {
    const phases: IlmPolicyForFlyout['phases'] = {
      hot: { actions: { downsample: {} } },
      warm: { actions: { downsample: {} } },
      cold: { actions: {} },
      frozen: { actions: { downsample: {} } },
    };

    expect(getIlmPolicySummaryStats(phases).downsampleStepCount).toBe(2);
  });
});
