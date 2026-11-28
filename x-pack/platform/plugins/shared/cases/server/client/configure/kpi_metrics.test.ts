/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignKpiMetricIds } from './kpi_metrics';

describe('assignKpiMetricIds', () => {
  const customMetric = {
    kind: 'custom' as const,
    label: 'Critical cases',
    index: 'cases' as const,
    query: 'case.severity: critical',
    display: 'value' as const,
  };

  it('returns undefined when no metrics are sent', () => {
    expect(assignKpiMetricIds(undefined)).toBeUndefined();
  });

  it('generates an id for each metric without one', () => {
    const result = assignKpiMetricIds({ casesList: [customMetric, customMetric] });
    const ids = result?.casesList?.map(({ id }) => id) ?? [];

    expect(ids).toHaveLength(2);
    expect(ids[0]).toEqual(expect.any(String));
    expect(ids[0]).not.toEqual(ids[1]);
  });

  it('keeps an existing id', () => {
    const result = assignKpiMetricIds({ caseDetails: [{ ...customMetric, id: 'my-id' }] });

    expect(result?.caseDetails?.[0].id).toBe('my-id');
  });

  it('keeps a page key that is not sent absent', () => {
    const result = assignKpiMetricIds({ casesList: [] });

    expect(result).toEqual({ casesList: [] });
    expect(result).not.toHaveProperty('caseDetails');
  });

  it('keeps the default display of the KPI tiles', () => {
    expect(assignKpiMetricIds({ casesListDisplay: 'collapsed' })).toEqual({
      casesListDisplay: 'collapsed',
    });
  });
});
