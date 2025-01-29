/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionStatusOptions } from '../../types';

import { getPage, getPerPage, hasRolloutPeriodPassed } from './action_status';

describe('getPage', () => {
  it('should return the default value when there are no pagination options', () => {
    const options = {} as ActionStatusOptions;
    expect(getPage(options)).toBe(0);
  });

  it('should return the default value when options.page is undefined', () => {
    const options = { perPage: 5 } as ActionStatusOptions;
    expect(getPage(options)).toBe(0);
  });

  it('should return the default value when options.perPage is undefined', () => {
    const options = { page: 1 } as ActionStatusOptions;
    expect(getPage(options)).toBe(0);
  });

  it('should return a value scaled to options.page and options.perPage', () => {
    const options = { page: 1, perPage: 5 } as ActionStatusOptions;
    expect(getPage(options)).toBe(5);
  });
});

describe('getPerPage', () => {
  it('should return the default value when there are no pagination options', () => {
    const options = {} as ActionStatusOptions;
    expect(getPerPage(options)).toBe(20);
  });

  it('should return the default value when options.page is undefined', () => {
    const options = { perPage: 5 } as ActionStatusOptions;
    expect(getPerPage(options)).toBe(20);
  });

  it('should return the default value when options.perPage is undefined', () => {
    const options = { page: 1 } as ActionStatusOptions;
    expect(getPerPage(options)).toBe(20);
  });

  it('should return a value scaled to options.page and options.perPage', () => {
    const options = { page: 1, perPage: 5 } as ActionStatusOptions;
    expect(getPerPage(options)).toBe(10);
  });
});

describe('hasRolloutPeriodPassed', () => {
  it('should return true when rollout period has passed', () => {
    const source = {
      start_time: '2022-12-30T10:52:24.269Z',
      rollout_duration_seconds: 3600,
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(true);
  });

  it('should return false when rollout period not set', () => {
    const source = {
      start_time: '2022-12-30T10:52:24.269Z',
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });

  it('should return false when not upgrade action', () => {
    const source = {
      start_time: '2022-12-30T10:52:24.269Z',
      rollout_duration_seconds: 3600,
      type: 'UNENROLL',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });

  it('should return false when rollout period has not passed', () => {
    const source = {
      start_time: new Date().toISOString(),
      rollout_duration_seconds: 3600,
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });

  it('should return false when start_time not set', () => {
    const source = {
      rollout_duration_seconds: 3600,
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });
});
