/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinDestinationRows } from './join_destination_rows';

const rateRows = [
  { id: 'es-prod', incoming_rate: 4.6, failed_rate: 0, avg_latency: 0.18 },
  { id: 'es-dev', incoming_rate: 4.2, failed_rate: 0.5, avg_latency: 0.17 },
];

const sumsRows = [
  { id: 'es-prod', bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
  { id: 'es-prod', bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
  { id: 'es-dev', bucket: '2026-10-20T10:00:00.000Z', sum_items: 90 },
];

describe('joinDestinationRows', () => {
  it('has one object per destination with its rates and series', () => {
    expect(joinDestinationRows({ rateRows, sumsRows })).toEqual({
      'es-prod': {
        incoming_rate: 4.6,
        failed_rate: 0,
        avg_latency: 0.18,
        series: [
          { bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
          { bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
        ],
      },
      'es-dev': {
        incoming_rate: 4.2,
        failed_rate: 0.5,
        avg_latency: 0.17,
        series: [{ bucket: '2026-10-20T10:00:00.000Z', sum_items: 90 }],
      },
    });
  });

  it('leaves out a destination that has rates but no items in the window', () => {
    const shaped = joinDestinationRows({
      rateRows,
      sumsRows: sumsRows.filter(({ id }) => id === 'es-prod'),
    });

    expect(Object.keys(shaped)).toEqual(['es-prod']);
  });

  it('keeps the series of a destination that has no rate row', () => {
    const shaped = joinDestinationRows({ rateRows: [], sumsRows });

    expect(shaped['es-dev']).toEqual({
      series: [{ bucket: '2026-10-20T10:00:00.000Z', sum_items: 90 }],
    });
  });

  it('has no destinations for no rows', () => {
    expect(joinDestinationRows({ rateRows: [], sumsRows: [] })).toEqual({});
  });
});
