/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRunMode } from './get_run_mode';

describe('getRunMode', () => {
  it('returns production when isTestRun is false', () => {
    expect(getRunMode({ isTestRun: false })).toEqual({ runMode: 'production' });
  });

  it('returns test when isTestRun without stepId', () => {
    expect(getRunMode({ isTestRun: true })).toEqual({ runMode: 'test' });
  });

  it('returns stepTest with target name when stepId is set', () => {
    expect(getRunMode({ isTestRun: true, stepId: 'search_parks' })).toEqual({
      runMode: 'stepTest',
      stepTestTargetName: 'search_parks',
    });
  });
});
