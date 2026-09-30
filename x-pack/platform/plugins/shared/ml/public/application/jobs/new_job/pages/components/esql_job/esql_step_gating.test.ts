/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlWizardState } from './esql_wizard_context';
import {
  computeEsqlStepGating,
  isJobDetailsStepValid,
  isPickFieldsStepValid,
  isQueryTimeRangeStepValid,
} from './esql_step_gating';
import { ESQL_WIZARD_STEPS } from './esql_wizard_steps';

const baseState: EsqlWizardState = {
  jobId: '',
  jobDescription: '',
  jobGroups: [],
  queryProbeState: 'success',
  columnsErrorMessage: undefined,
  query: 'FROM logs-*',
  sourceTimeField: '@timestamp',
  sourceTimeFieldTouched: false,
  bucketSpan: '1h',
  columns: [
    { name: 'bucket', type: 'date', userDefined: false },
    { name: 'avg_bytes', type: 'double', userDefined: false },
    { name: 'host', type: 'keyword', userDefined: false },
  ],
  emittedTimeField: 'bucket',
  detectors: [{ function: 'mean', field: 'avg_bytes' }],
  influencers: ['host'],
  summaryCountFieldName: '',
  delayedDataCheckEnabled: false,
  wizardStart: 'now-15m',
  wizardEnd: 'now',
  continueInRealTime: true,
  histogramStatus: 'success',
  histogramTotalRows: 42,
  histogramErrorMessage: undefined,
  histogramSeries: [{ time: 0, value: 42 }],
  rangeRefreshToken: 0,
};

describe('isQueryTimeRangeStepValid', () => {
  it('is valid once columns, time range, and a non-empty histogram all resolve', () => {
    expect(isQueryTimeRangeStepValid(baseState)).toBe(true);
  });

  it.each<[string, Partial<EsqlWizardState>]>([
    ['columns did not resolve', { queryProbeState: 'error', columns: [] }],
    ['probe still loading', { queryProbeState: 'loading' }],
    ['invalid time range (empty start)', { wizardStart: '' }],
    ['invalid time range (MAX end)', { wizardEnd: 'MAX' }],
    ['histogram still loading', { histogramStatus: 'loading' }],
    ['histogram errored', { histogramStatus: 'error', histogramErrorMessage: 'boom' }],
    ['histogram returned zero rows', { histogramTotalRows: 0 }],
  ])('is blocked when %s', (_description, partial) => {
    expect(isQueryTimeRangeStepValid({ ...baseState, ...partial })).toBe(false);
  });
});

describe('isPickFieldsStepValid', () => {
  it('is valid with at least one valid detector, bucket span, and source time field', () => {
    expect(isPickFieldsStepValid(baseState)).toBe(true);
  });

  it('is blocked with no detectors', () => {
    expect(isPickFieldsStepValid({ ...baseState, detectors: [] })).toBe(false);
  });

  it('is blocked when a detector field no longer resolves against the columns', () => {
    expect(
      isPickFieldsStepValid({
        ...baseState,
        detectors: [{ function: 'mean', field: 'removed_field' }],
      })
    ).toBe(false);
  });

  it('is blocked when a rare/freq_rare detector has no by field', () => {
    expect(isPickFieldsStepValid({ ...baseState, detectors: [{ function: 'rare' }] })).toBe(false);
  });

  it('is valid when a rare/freq_rare detector has a by field', () => {
    expect(
      isPickFieldsStepValid({
        ...baseState,
        detectors: [{ function: 'rare', byField: 'host' }],
      })
    ).toBe(true);
  });

  it('is blocked with an empty bucket span', () => {
    expect(isPickFieldsStepValid({ ...baseState, bucketSpan: '' })).toBe(false);
  });

  it('is blocked with an empty source time field', () => {
    expect(isPickFieldsStepValid({ ...baseState, sourceTimeField: '' })).toBe(false);
  });

  it('is blocked when the emitted time field no longer resolves', () => {
    expect(isPickFieldsStepValid({ ...baseState, emittedTimeField: 'removed_time' })).toBe(false);
  });
});

describe('isJobDetailsStepValid', () => {
  it('is blocked with no job id', () => {
    expect(isJobDetailsStepValid({ ...baseState, jobId: '' })).toBe(false);
  });

  it('is blocked with an invalid job id', () => {
    expect(isJobDetailsStepValid({ ...baseState, jobId: '_invalid' })).toBe(false);
  });

  it('is valid with a valid job id and no groups', () => {
    expect(isJobDetailsStepValid({ ...baseState, jobId: 'esql-job-1' })).toBe(true);
  });

  it('is blocked when a group id is invalid', () => {
    expect(
      isJobDetailsStepValid({ ...baseState, jobId: 'esql-job-1', jobGroups: ['_bad-group'] })
    ).toBe(false);
  });

  it('is valid when all group ids are valid', () => {
    expect(
      isJobDetailsStepValid({
        ...baseState,
        jobId: 'esql-job-1',
        jobGroups: ['team-a', 'team-b'],
      })
    ).toBe(true);
  });
});

describe('computeEsqlStepGating', () => {
  it('reports gating for every step and defaults SUMMARY to true', () => {
    const gating = computeEsqlStepGating({ ...baseState, jobId: 'esql-job-1' });

    expect(gating).toEqual({
      [ESQL_WIZARD_STEPS.QUERY_TIME_RANGE]: true,
      [ESQL_WIZARD_STEPS.PICK_FIELDS]: true,
      [ESQL_WIZARD_STEPS.JOB_DETAILS]: true,
      [ESQL_WIZARD_STEPS.SUMMARY]: true,
    });
  });
});
