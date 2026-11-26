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
    pipeline: 'main',
    route_index: 0,
    incoming_rate: 4.6,
    avg_duration_per_item: 5.2e-6,
  };

  it('places a row into an instance of the processor, with units', () => {
    const result = mapProcessorStatsRows({ rows: [row] })['uppercase-message'];

    expect(result).toEqual({
      instances: [
        {
          pipeline_id: 'main',
          route_index: 0,
          processing_duration: { average: { value: 5.2e-6, unit: 's' } },
          events: {
            incoming: { rate: { value: 4.6, unit: '{item}', time_unit: 's' } },
            failed: { rate: { value: null, unit: '{item}', time_unit: 's' } },
          },
        },
      ],
    });
    expect(streamsUnitStatsProcessorResultSchema.parse(result)).toEqual(result);
  });

  it('has an instance for every pipeline and route, with no route index for the pipeline itself', () => {
    const rows = [row, { ...row, route_index: null, incoming_rate: 2.1 }];

    const { instances } = mapProcessorStatsRows({ rows })['uppercase-message'];

    expect(
      instances.map(({ pipeline_id: pipeline, route_index: route }) => [pipeline, route])
    ).toEqual([
      ['main', 0],
      ['main', null],
    ]);
    expect(instances[1].events.incoming.rate.value).toBe(2.1);
  });

  it('has a result for every processor', () => {
    const rows = [row, { ...row, step: 'add-tags', incoming_rate: 2.1 }];

    const results = mapProcessorStatsRows({ rows });

    expect(Object.keys(results)).toEqual(['uppercase-message', 'add-tags']);
    expect(results['add-tags'].instances[0].events.incoming.rate.value).toBe(2.1);
  });

  it('leaves a column that ES|QL returned as null as no data', () => {
    const rows = [{ ...row, incoming_rate: null, avg_duration_per_item: null }];

    const [instance] = mapProcessorStatsRows({ rows })['uppercase-message'].instances;

    expect(instance.events.incoming.rate).toEqual({
      value: null,
      unit: '{item}',
      time_unit: 's',
    });
    expect(instance.processing_duration.average).toEqual({ value: null, unit: 's' });
  });

  // Processor failures are not queried yet, so there is no failed_rate column.
  it('leaves the failed rate as no data when there is no failed_rate column', () => {
    const [instance] = mapProcessorStatsRows({ rows: [row] })['uppercase-message'].instances;

    expect(instance.events.failed.rate.value).toBeNull();
  });

  it('places the failed rate once the query returns it, including a real zero', () => {
    const rows = [{ ...row, failed_rate: 0 }];

    const [instance] = mapProcessorStatsRows({ rows })['uppercase-message'].instances;

    expect(instance.events.failed.rate).toEqual({
      value: 0,
      unit: '{item}',
      time_unit: 's',
    });
  });
});
