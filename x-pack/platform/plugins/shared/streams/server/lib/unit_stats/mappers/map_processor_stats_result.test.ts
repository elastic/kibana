/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsProcessorResultSchema } from '@kbn/streams-schema';
import { joinProcessorRows, mapProcessorStatsRows } from './map_processor_stats_result';

describe('mapProcessorStatsRows', () => {
  const joined = {
    incoming_rate: 4.6,
    sum_items_in: 3870,
    avg_duration_per_item: 5.2e-6,
  };

  it('places the joined rows into the result, with units', () => {
    const result = mapProcessorStatsRows({ rows: { 'uppercase-message': joined } })[
      'uppercase-message'
    ];

    expect(result).toEqual({
      processing_duration: { average: { value: 5.2e-6, unit: 's' } },
      events: {
        incoming: {
          rate: { value: 4.6, unit: '{item}', time_unit: 's' },
          failures: { rate: { value: null, unit: null, time_unit: null } },
        },
      },
    });
    expect(streamsUnitStatsProcessorResultSchema.parse(result)).toEqual(result);
  });

  it('has a result for every processor', () => {
    const rows = { 'uppercase-message': joined, 'add-tags': { ...joined, incoming_rate: 2.1 } };

    const results = mapProcessorStatsRows({ rows });

    expect(Object.keys(results)).toEqual(['uppercase-message', 'add-tags']);
    expect(results['add-tags'].events.incoming.rate.value).toBe(2.1);
  });

  it('leaves a column that ES|QL returned as null as no data', () => {
    const rows = {
      'uppercase-message': {
        incoming_rate: null,
        sum_items_in: 3870,
        avg_duration_per_item: null,
      },
    };

    const result = mapProcessorStatsRows({ rows })['uppercase-message'];

    expect(result.events.incoming.rate).toEqual({ value: null, unit: null, time_unit: null });
    expect(result.processing_duration.average).toEqual({ value: null, unit: null });
  });

  // Processor failures are not queried yet, so there is no failed_rate column.
  it('leaves the failures rate as no data when there is no failed_rate column', () => {
    const result = mapProcessorStatsRows({ rows: { 'uppercase-message': joined } })[
      'uppercase-message'
    ];

    expect(result.events.incoming.failures.rate.value).toBeNull();
  });

  it('places the failures rate once the query returns it, including a real zero', () => {
    const rows = { 'uppercase-message': { ...joined, failed_rate: 0 } };

    const result = mapProcessorStatsRows({ rows })['uppercase-message'];

    expect(result.events.incoming.failures.rate).toEqual({
      value: 0,
      unit: '{item}',
      time_unit: 's',
    });
  });
});

const rateRows = [{ step: 'uppercase-message', incoming_rate: 4.6 }];

const sumsRows = [{ step: 'uppercase-message', sum_items_in: 3870, avg_duration_per_item: 5.2e-6 }];

describe('joinProcessorRows', () => {
  it('has one object per processor with its rate and sums', () => {
    expect(joinProcessorRows({ rateRows, sumsRows })).toEqual({
      'uppercase-message': {
        incoming_rate: 4.6,
        sum_items_in: 3870,
        avg_duration_per_item: 5.2e-6,
      },
    });
  });

  it('keeps a processor with items in and no rate row', () => {
    expect(joinProcessorRows({ rateRows: [], sumsRows })).toEqual({
      'uppercase-message': { sum_items_in: 3870, avg_duration_per_item: 5.2e-6 },
    });
  });

  it('has no processors for no rows', () => {
    expect(joinProcessorRows({ rateRows: [], sumsRows: [] })).toEqual({});
  });
});
