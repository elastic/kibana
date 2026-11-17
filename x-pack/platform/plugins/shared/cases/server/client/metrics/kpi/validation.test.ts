/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKpiMetricFieldError, getKpiMetricQueryError } from './validation';

describe('getKpiMetricFieldError', () => {
  it('accepts a count with no field', () => {
    expect(getKpiMetricFieldError({ index: 'cases' })).toBeUndefined();
    expect(getKpiMetricFieldError({ index: 'cases', aggregation: { type: 'count' } })).toBe(
      undefined
    );
  });

  it('accepts a numeric field for a numeric aggregation', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'median', field: 'case.time_to_resolve' },
      })
    ).toBeUndefined();
  });

  it('rejects a numeric aggregation with no field', () => {
    expect(getKpiMetricFieldError({ index: 'cases', aggregation: { type: 'avg' } })).toBe(
      'The avg aggregation needs a field.'
    );
  });

  it('rejects a field that is not in the catalog of the index', () => {
    expect(
      getKpiMetricFieldError({
        index: 'activity',
        aggregation: { type: 'avg', field: 'case.time_to_resolve' },
      })
    ).toBe('The field case.time_to_resolve is not allowed for the activity index.');
  });

  it('rejects a keyword field for a numeric aggregation', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'sum', field: 'case.status' },
      })
    ).toBe('The sum aggregation needs a numeric field. case.status is not a numeric field.');
  });

  it('rejects a numeric field for a unique count', () => {
    expect(
      getKpiMetricFieldError({
        index: 'cases',
        aggregation: { type: 'cardinality', field: 'case.total_alerts' },
      })
    ).toBe('The unique count needs a keyword field. case.total_alerts is not a keyword field.');
  });
});

describe('getKpiMetricQueryError', () => {
  it('accepts an empty query', () => {
    expect(getKpiMetricQueryError('')).toBeUndefined();
  });

  it('accepts a valid query', () => {
    expect(getKpiMetricQueryError('case.status: closed and case.severity: critical')).toBe(
      undefined
    );
  });

  it('rejects an unbalanced query', () => {
    expect(getKpiMetricQueryError('status: closed or (space_id: *')).toContain(
      'The KQL query is not valid'
    );
  });

  describe('percent', () => {
    it('accepts a percent count', () => {
      expect(getKpiMetricFieldError({ index: 'cases', percent: true })).toBeUndefined();
    });

    it('rejects a percent metric with an aggregation', () => {
      expect(
        getKpiMetricFieldError({
          index: 'cases',
          percent: true,
          aggregation: { type: 'sum', field: 'case.total_alerts' },
        })
      ).toBe('A percent metric counts the documents. It cannot use an aggregation.');
    });
  });
});
