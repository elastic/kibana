/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { compileLensDataViewChart } from './compile_chart';

const chart = (config: object): LensApiConfig => lensApiConfigSchema.parse(config);

describe('compileLensDataViewChart', () => {
  it("compiles a metric chart's layer through Lens's own API transform", () => {
    const layers = compileLensDataViewChart(
      chart({
        type: 'metric',
        data_source: { type: 'data_view_reference', ref_id: 'logs-dv' },
        sampling: 0.5,
        metrics: [
          { type: 'primary', operation: 'median', field: 'bytes' },
          { type: 'secondary', operation: 'count' },
        ],
      })
    );

    expect(layers).toEqual([
      {
        layerId: 'layer_0',
        compiled: {
          request: {
            kind: 'aggs',
            dataView: 'logs-dv',
            aggs: [
              {
                id: '0',
                enabled: true,
                schema: 'metric',
                type: 'median',
                params: { field: 'bytes' },
              },
              {
                id: '1',
                enabled: true,
                schema: 'metric',
                type: 'count',
                params: { emptyAsNull: false },
              },
            ],
            metricsAtAllLevels: false,
            partialRows: false,
            probability: 0.5,
          },
          idMap: {
            'col-0-0': [expect.objectContaining({ id: 'metric_accessor_metric' })],
            'col-1-1': [expect.objectContaining({ id: 'metric_accessor_secondary' })],
          },
        },
      },
    ]);
  });

  it('runs an ad hoc data view from the spec Lens keeps for it', () => {
    const [layer] = compileLensDataViewChart(
      chart({
        type: 'metric',
        data_source: { type: 'data_view_spec', index_pattern: 'logs-*', time_field: '@timestamp' },
        metrics: [{ type: 'primary', operation: 'count' }],
      })
    );

    expect(layer).toEqual({
      layerId: 'layer_0',
      compiled: expect.objectContaining({
        request: expect.objectContaining({
          dataView: expect.objectContaining({ title: 'logs-*', timeFieldName: '@timestamp' }),
        }),
      }),
    });
  });

  it("reports the layer it can't compile yet, with the reason", () => {
    const layers = compileLensDataViewChart(
      chart({
        type: 'metric',
        data_source: { type: 'data_view_reference', ref_id: 'logs-dv' },
        metrics: [{ type: 'primary', operation: 'count' }],
        breakdown_by: { operation: 'terms', fields: ['host.name'] },
      })
    );

    expect(layers).toEqual([
      {
        layerId: 'layer_0',
        unsupported: 'Lens "terms" columns on a data view cannot be materialized yet.',
      },
    ]);
  });
});
