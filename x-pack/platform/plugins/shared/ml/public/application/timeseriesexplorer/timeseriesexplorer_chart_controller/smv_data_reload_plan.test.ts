/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSmvDataReloadPlan, type SmvDataReloadSnapshot } from './smv_data_reload_plan';

const base: SmvDataReloadSnapshot = {
  bounds: { min: 1, max: 2 },
  lastRefresh: 1,
  selectedDetectorIndex: 0,
  selectedEntities: {},
  selectedForecastId: undefined,
  selectedJobId: 'job-1',
  functionDescription: 'mean',
};

describe('getSmvDataReloadPlan', () => {
  it('mount (no previous) reloads with full refresh', () => {
    expect(getSmvDataReloadPlan(undefined, base)).toEqual({
      shouldReload: true,
      fullRefresh: true,
    });
  });

  it('lastRefresh tick from non-zero reloads without full refresh', () => {
    const prev = { ...base, lastRefresh: 5 };
    const next = { ...base, lastRefresh: 6 };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: true,
      fullRefresh: false,
    });
  });

  it('lastRefresh change while previous lastRefresh is 0 does not reload', () => {
    const prev = { ...base, lastRefresh: 0 };
    const next = { ...base, lastRefresh: 99 };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: false,
      fullRefresh: false,
    });
  });

  it('bounds change reloads with full refresh', () => {
    const prev = { ...base };
    const next = { ...base, bounds: { min: 3, max: 4 } };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: true,
      fullRefresh: true,
    });
  });

  it('detector change reloads with full refresh', () => {
    const prev = { ...base };
    const next = { ...base, selectedDetectorIndex: 1 };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: true,
      fullRefresh: true,
    });
  });

  it('selectedJobId change reloads with full refresh', () => {
    const prev = { ...base };
    const next = { ...base, selectedJobId: 'job-2' };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: true,
      fullRefresh: true,
    });
  });

  it('materialized job id change reloads with full refresh (embeddable parity)', () => {
    const prev = { ...base, materializedJobId: 'job-1' };
    const next = { ...base, materializedJobId: 'job-2', selectedJobId: 'job-1' };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: true,
      fullRefresh: true,
    });
  });

  it('no relevant change does not reload', () => {
    const prev = { ...base };
    const next = { ...base };
    expect(getSmvDataReloadPlan(prev, next)).toEqual({
      shouldReload: false,
      fullRefresh: false,
    });
  });
});
