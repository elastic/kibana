/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { toAlertSummaryResponse } from './to_alert_summary_response';

const buildResponse = (
  rows: Array<[string | number | null, number | bigint, number | bigint]>
): EsqlQueryResponse =>
  ({
    columns: [
      { name: 'bucket', type: 'date' },
      { name: 'active_events', type: 'long' },
      { name: 'recovered_events', type: 'long' },
    ],
    values: rows,
  } as unknown as EsqlQueryResponse);

describe('toAlertSummaryResponse', () => {
  it('returns zeros when the response has no rows', () => {
    expect(toAlertSummaryResponse(buildResponse([]))).toEqual({
      activeEventCount: 0,
      recoveredEventCount: 0,
      activeSeries: [],
      recoveredSeries: [],
    });
  });

  it('sums counts across buckets and builds parallel active/recovered series', () => {
    const response = buildResponse([
      ['2026-01-01T00:00:00.000Z', 3, 1],
      ['2026-01-02T00:00:00.000Z', 0, 2],
      ['2026-01-03T00:00:00.000Z', 5, 0],
    ]);

    const result = toAlertSummaryResponse(response);

    expect(result.activeEventCount).toBe(8);
    expect(result.recoveredEventCount).toBe(3);
    expect(result.activeSeries).toEqual([
      {
        key: Date.parse('2026-01-01T00:00:00.000Z'),
        key_as_string: '2026-01-01T00:00:00.000Z',
        doc_count: 3,
      },
      {
        key: Date.parse('2026-01-02T00:00:00.000Z'),
        key_as_string: '2026-01-02T00:00:00.000Z',
        doc_count: 0,
      },
      {
        key: Date.parse('2026-01-03T00:00:00.000Z'),
        key_as_string: '2026-01-03T00:00:00.000Z',
        doc_count: 5,
      },
    ]);
    expect(result.recoveredSeries.map((b) => b.doc_count)).toEqual([1, 2, 0]);
  });

  it('skips rows with unparseable bucket keys', () => {
    const response = buildResponse([
      [null, 1, 1],
      ['2026-01-01T00:00:00.000Z', 2, 3],
    ]);

    const result = toAlertSummaryResponse(response);

    expect(result.activeSeries).toHaveLength(1);
    expect(result.recoveredSeries).toHaveLength(1);
    expect(result.activeEventCount).toBe(2);
    expect(result.recoveredEventCount).toBe(3);
  });

  it('coerces bigint counts to numbers', () => {
    const response = buildResponse([['2026-01-01T00:00:00.000Z', 10n as unknown as bigint, 0]]);

    const result = toAlertSummaryResponse(response);

    expect(result.activeEventCount).toBe(10);
    expect(result.activeSeries[0].doc_count).toBe(10);
  });

  it('returns an empty response when expected columns are missing', () => {
    const response = { columns: [], values: [] } as unknown as EsqlQueryResponse;
    expect(toAlertSummaryResponse(response)).toEqual({
      activeEventCount: 0,
      recoveredEventCount: 0,
      activeSeries: [],
      recoveredSeries: [],
    });
  });
});
