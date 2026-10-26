/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsProcessorResultSchema } from '@kbn/streams-schema';
import { mapProcessorStatsRows } from './map_processor_stats_result';

describe('mapProcessorStatsRows', () => {
  const row = {
    step: 'uppercase-message',
    incoming_rate: 4.6,
    avg_duration_per_item: 5.2e-6,
  };

  it('places the row into the result, with units', () => {
    const result = mapProcessorStatsRows({ rows: [row] })['uppercase-message'];

    expect(result).toEqual({
      processing_duration: { average: { value: 5.2e-6, unit: 's' } },
      events: {
        incoming: {
          rate: { value: 4.6, unit: '{item}', time_unit: 's' },
        },
        failed: { rate: { value: null, unit: '{item}', time_unit: 's' } },
      },
    });
    expect(streamsUnitStatsProcessorResultSchema.parse(result)).toEqual(result);
  });

  it('has a result for every processor', () => {
    const rows = [row, { ...row, step: 'add-tags', incoming_rate: 2.1 }];

    const results = mapProcessorStatsRows({ rows });

    expect(Object.keys(results)).toEqual(['uppercase-message', 'add-tags']);
    expect(results['add-tags'].events.incoming.rate.value).toBe(2.1);
  });

  it('leaves a column that ES|QL returned as null as no data', () => {
    const rows = [{ step: 'uppercase-message', incoming_rate: null, avg_duration_per_item: null }];

    const result = mapProcessorStatsRows({ rows })['uppercase-message'];

    expect(result.events.incoming.rate).toEqual({ value: null, unit: '{item}', time_unit: 's' });
    expect(result.processing_duration.average).toEqual({ value: null, unit: 's' });
  });

  // Processor failures are not queried yet, so there is no failed_rate column.
  it('leaves the failed rate as no data when there is no failed_rate column', () => {
    const result = mapProcessorStatsRows({ rows: [row] })['uppercase-message'];

    expect(result.events.failed.rate.value).toBeNull();
  });

  it('places the failed rate once the query returns it, including a real zero', () => {
    const rows = [{ ...row, failed_rate: 0 }];

    const result = mapProcessorStatsRows({ rows })['uppercase-message'];

    expect(result.events.failed.rate).toEqual({
      value: 0,
      unit: '{item}',
      time_unit: 's',
    });
  });
});
