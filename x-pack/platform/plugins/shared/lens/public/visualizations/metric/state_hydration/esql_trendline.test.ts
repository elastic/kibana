/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatasourceStates,
  MetricVisualizationState,
  TextBasedLayer,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import { LENS_DATASOURCE_ID, LENS_METRIC_ID } from '@kbn/lens-common';
import {
  hydrateEsqlMetricTrendline,
  hydrateEsqlMetricTrendlineAfterSuggestion,
} from './esql_trendline';

const visualizationState: MetricVisualizationState = {
  layerId: 'layer_0',
  layerType: 'data',
  metricAccessor: 'metric_accessor_metric',
  secondaryMetricAccessor: 'metric_accessor_secondary',
  breakdownByAccessor: 'metric_accessor_breakdown',
  trendlineLayerId: 'layer_0_trendline',
  trendlineLayerType: 'metricTrendline',
  trendlineMetricAccessor: 'metric_accessor_trendline',
  trendlineTimeAccessor: 'x_date_histogram',
  trendlineSecondaryMetricAccessor: 'metric_accessor_secondary_trendline',
  trendlineBreakdownByAccessor: 'metric_accessor_breakdown_trendline',
};

const mainLayer = {
  index: 'esql-logs',
  query: { esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes)' },
  timeField: '@timestamp',
  columns: [
    {
      columnId: 'metric_accessor_metric',
      fieldName: 'avg_bytes',
      meta: { type: 'number' as const },
    },
    {
      columnId: 'metric_accessor_secondary',
      fieldName: 'avg_bytes',
      meta: { type: 'number' as const },
    },
    {
      columnId: 'metric_accessor_breakdown',
      fieldName: 'host.name',
      meta: { type: 'string' as const },
    },
  ],
};

const textBasedDatasourceStates = (
  layers: TextBasedPersistedState['layers']
): DatasourceStates => ({
  [LENS_DATASOURCE_ID.TEXT_BASED]: {
    isLoading: false,
    state: { layers },
  },
});

const getTextBasedLayers = (datasourceStates: DatasourceStates): Record<string, TextBasedLayer> =>
  (datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED]?.state as TextBasedPersistedState).layers;

const applyHydration = (...args: Parameters<typeof hydrateEsqlMetricTrendline>) =>
  hydrateEsqlMetricTrendline(...args).datasourceStates;

describe('hydrateEsqlMetricTrendline', () => {
  it('is a no-op when trendline is not enabled', () => {
    const datasourceStates = textBasedDatasourceStates({ layer_0: mainLayer });
    expect(
      applyHydration({ ...visualizationState, trendlineLayerId: undefined }, datasourceStates)
    ).toBe(datasourceStates);
  });

  it('is a no-op when the trendline already matches index, time field, and time column', () => {
    const existingTrendlineLayer = {
      index: 'esql-logs',
      query: { esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 1 hour)' },
      timeField: '@timestamp',
      columns: [{ columnId: 'x_date_histogram', fieldName: '@timestamp' }],
    };
    const datasourceStates = textBasedDatasourceStates({
      layer_0: mainLayer,
      layer_0_trendline: existingTrendlineLayer,
    });
    expect(applyHydration(visualizationState, datasourceStates)).toBe(datasourceStates);
  });

  it('rebuilds the trendline layer when the main layer time field changes', () => {
    const datasourceStates = textBasedDatasourceStates({
      layer_0: mainLayer,
      layer_0_trendline: {
        index: 'esql-ecommerce',
        query: {
          esql: 'FROM ecommerce | STATS avg_bytes = AVG(bytes) BY BUCKET(order_date, 1 hour)',
        },
        timeField: 'order_date',
        columns: [{ columnId: 'x_date_histogram', fieldName: 'order_date' }],
      },
    });

    const result = applyHydration(visualizationState, datasourceStates);
    const trendlineLayer = getTextBasedLayers(result).layer_0_trendline;

    expect(trendlineLayer.timeField).toBe('@timestamp');
    expect(trendlineLayer.index).toBe('esql-logs');
    expect(trendlineLayer.query?.esql).toContain('BUCKET');
    expect(trendlineLayer.query?.esql).not.toContain('order_date');
  });

  it('rebuilds when the time column is stale even if index and time field already match', () => {
    const datasourceStates = textBasedDatasourceStates({
      layer_0: mainLayer,
      layer_0_trendline: {
        index: 'esql-logs',
        query: {
          esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY BUCKET(order_date, 1 hour)',
        },
        timeField: '@timestamp',
        columns: [
          {
            columnId: 'x_date_histogram',
            fieldName: 'order_date',
            meta: { type: 'date' as const },
          },
        ],
      },
    });

    const result = applyHydration(visualizationState, datasourceStates);
    const trendlineLayer = getTextBasedLayers(result).layer_0_trendline;

    expect(trendlineLayer.query?.esql).toContain('BUCKET');
    expect(trendlineLayer.query?.esql).not.toContain('order_date');
    expect(trendlineLayer.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columnId: 'x_date_histogram',
          fieldName: expect.stringContaining('@timestamp'),
        }),
      ])
    );
  });

  it('is a no-op when the main layer has no time field', () => {
    const datasourceStates = textBasedDatasourceStates({
      layer_0: { ...mainLayer, timeField: undefined },
    });
    expect(applyHydration(visualizationState, datasourceStates)).toBe(datasourceStates);
  });

  it('is a no-op without a text-based datasource', () => {
    const datasourceStates: DatasourceStates = {
      formBased: { isLoading: false, state: { layers: {} } },
    };
    expect(applyHydration(visualizationState, datasourceStates)).toBe(datasourceStates);
  });

  it('creates a trendline layer after the main layer time field is hydrated', () => {
    const datasourceStates = textBasedDatasourceStates({ layer_0: mainLayer });
    const result = applyHydration(visualizationState, datasourceStates);

    const layers = getTextBasedLayers(result);
    expect(layers.layer_0_trendline).toMatchObject({
      index: 'esql-logs',
      timeField: '@timestamp',
      query: {
        esql: expect.stringContaining('BUCKET'),
      },
    });
    expect(layers.layer_0_trendline.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columnId: 'x_date_histogram',
          fieldName: expect.any(String),
          meta: { type: 'date' },
        }),
        expect.objectContaining({
          columnId: 'metric_accessor_trendline',
          fieldName: 'avg_bytes',
        }),
        expect.objectContaining({
          columnId: 'metric_accessor_secondary_trendline',
          fieldName: 'avg_bytes',
        }),
        expect.objectContaining({
          columnId: 'metric_accessor_breakdown_trendline',
          fieldName: 'host.name',
        }),
      ])
    );
    expect(datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED]?.state).not.toHaveProperty(
      'layers.layer_0_trendline'
    );
  });

  it('rewrites a query without STATS using AVG and the hydrated time field', () => {
    const datasourceStates = textBasedDatasourceStates({
      layer_0: {
        ...mainLayer,
        query: { esql: 'FROM logs-*' },
        columns: [
          {
            columnId: 'metric_accessor_metric',
            fieldName: 'bytes',
            meta: { type: 'number' as const },
          },
        ],
      },
    });
    const result = applyHydration(
      {
        ...visualizationState,
        secondaryMetricAccessor: undefined,
        breakdownByAccessor: undefined,
        trendlineSecondaryMetricAccessor: undefined,
        trendlineBreakdownByAccessor: undefined,
      },
      datasourceStates
    );

    const trendlineLayer = getTextBasedLayers(result).layer_0_trendline;
    expect(trendlineLayer.query?.esql).toContain('AVG');
    expect(trendlineLayer.query?.esql).toContain('BUCKET');
    expect(trendlineLayer.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columnId: 'metric_accessor_trendline',
          fieldName: expect.stringContaining('AVG'),
        }),
      ])
    );
  });

  it('preserves an aliased TBUCKET result column for a TS query', () => {
    const query =
      'TS metrics-* | STATS avg_cpu = AVG(AVG_OVER_TIME(cpu)) BY custom_time_bucket = TBUCKET(100)';
    const datasourceStates = textBasedDatasourceStates({
      layer_0: {
        ...mainLayer,
        query: { esql: query },
        columns: [
          {
            columnId: 'metric_accessor_metric',
            fieldName: 'avg_cpu',
            meta: { type: 'number' as const },
          },
        ],
      },
    });
    const result = applyHydration(
      {
        ...visualizationState,
        secondaryMetricAccessor: undefined,
        breakdownByAccessor: undefined,
        trendlineSecondaryMetricAccessor: undefined,
        trendlineBreakdownByAccessor: undefined,
      },
      datasourceStates
    );

    const trendlineLayer = getTextBasedLayers(result).layer_0_trendline;
    expect(trendlineLayer.query?.esql).toBe(query);
    expect(trendlineLayer.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columnId: 'x_date_histogram',
          fieldName: 'custom_time_bucket',
        }),
      ])
    );
  });

  it('omits a breakdown that is the time field and clears its trendline accessor', () => {
    const datasourceStates = textBasedDatasourceStates({
      layer_0: {
        ...mainLayer,
        columns: [
          mainLayer.columns[0],
          {
            columnId: 'metric_accessor_breakdown',
            fieldName: '@timestamp',
            meta: { type: 'date' as const },
          },
        ],
      },
    });
    const result = hydrateEsqlMetricTrendline(visualizationState, {
      ...datasourceStates,
    });
    const trendlineLayer = getTextBasedLayers(result.datasourceStates).layer_0_trendline;

    expect(
      trendlineLayer.columns.some(
        (column) => column.columnId === 'metric_accessor_breakdown_trendline'
      )
    ).toBe(false);
    expect(result.visualizationState).toEqual(
      expect.objectContaining({
        trendlineBreakdownByAccessor: undefined,
      })
    );
  });
});

describe('hydrateEsqlMetricTrendlineAfterSuggestion', () => {
  const previousVisualizationState: MetricVisualizationState = {
    ...visualizationState,
    metricAccessor: 'prev_metric',
    secondaryMetricAccessor: undefined,
    breakdownByAccessor: undefined,
  };

  it('restores trendline accessors and rebuilds the layer from the new main query', () => {
    const result = hydrateEsqlMetricTrendlineAfterSuggestion({
      visualizationType: LENS_METRIC_ID,
      visualizationState: {
        layerId: 'layer_0',
        layerType: 'data',
        metricAccessor: 'metric_accessor_metric',
      },
      textBasedState: { layers: { layer_0: mainLayer } },
      previousVisualizationState,
      esqlQuery: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
    });

    expect(result?.visualizationState).toEqual(
      expect.objectContaining({
        trendlineLayerId: 'layer_0_trendline',
        trendlineMetricAccessor: 'metric_accessor_trendline',
        trendlineTimeAccessor: 'x_date_histogram',
        trendlineBreakdownByAccessor: undefined,
        trendlineSecondaryMetricAccessor: undefined,
      })
    );
    expect(result?.textBasedState.layers.layer_0_trendline).toMatchObject({
      index: 'esql-logs',
      timeField: '@timestamp',
      query: { esql: expect.stringContaining('BUCKET') },
    });
  });

  it('returns undefined when the suggestion is not a metric chart', () => {
    expect(
      hydrateEsqlMetricTrendlineAfterSuggestion({
        visualizationType: 'lnsXY',
        visualizationState,
        textBasedState: { layers: { layer_0: mainLayer } },
        previousVisualizationState,
        esqlQuery: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
      })
    ).toBeUndefined();
  });

  it('rebuilds from the previous trendline time field when the suggestion main layer has none', () => {
    const previousTrendlineLayer = {
      index: 'esql-logs',
      query: {
        esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      },
      timeField: '@timestamp',
      columns: [
        {
          columnId: 'x_date_histogram',
          fieldName: '@timestamp',
          meta: { type: 'date' as const },
        },
      ],
    };

    const result = hydrateEsqlMetricTrendlineAfterSuggestion({
      visualizationType: LENS_METRIC_ID,
      visualizationState: {
        layerId: 'layer_0',
        layerType: 'data',
        metricAccessor: 'metric_accessor_metric',
      },
      textBasedState: {
        layers: {
          layer_0: { ...mainLayer, timeField: undefined },
        },
      },
      previousVisualizationState,
      previousTextBasedState: {
        layers: {
          layer_0: mainLayer,
          layer_0_trendline: previousTrendlineLayer,
        },
      },
      esqlQuery: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
    });

    expect(result?.textBasedState.layers.layer_0_trendline).toMatchObject({
      timeField: '@timestamp',
      query: { esql: expect.stringContaining('BUCKET') },
    });
    expect(result?.textBasedState.layers.layer_0.timeField).toBe('@timestamp');
    expect(result?.textBasedState.layers.layer_0_trendline.query?.esql).not.toContain('order_date');
  });

  it('does not reuse the previous time field when the suggestion targets a different index', () => {
    const previousTrendlineLayer = {
      index: 'esql-ecommerce',
      query: {
        esql: 'FROM ecommerce | STATS avg_bytes = AVG(bytes) BY BUCKET(order_date, 75, ?_tstart, ?_tend)',
      },
      timeField: 'order_date',
      columns: [
        {
          columnId: 'x_date_histogram',
          fieldName: 'order_date',
          meta: { type: 'date' as const },
        },
      ],
    };

    const result = hydrateEsqlMetricTrendlineAfterSuggestion({
      visualizationType: LENS_METRIC_ID,
      visualizationState: {
        layerId: 'layer_0',
        layerType: 'data',
        metricAccessor: 'metric_accessor_metric',
      },
      textBasedState: {
        layers: {
          layer_0: {
            ...mainLayer,
            index: 'esql-untime',
            query: { esql: 'FROM untime-* | STATS avg_bytes = AVG(bytes)' },
            timeField: undefined,
          },
        },
      },
      previousVisualizationState,
      previousTextBasedState: {
        layers: {
          layer_0: {
            ...mainLayer,
            index: 'esql-ecommerce',
            timeField: 'order_date',
            query: { esql: 'FROM ecommerce | STATS avg_bytes = AVG(bytes)' },
          },
          layer_0_trendline: previousTrendlineLayer,
        },
      },
      esqlQuery: 'FROM untime-* | STATS avg_bytes = AVG(bytes)',
    });

    expect(result).toBeUndefined();
  });

  it('keeps the previous trendline layer when the new query cannot be rebuilt', () => {
    const previousTrendlineLayer = {
      index: 'esql-logs',
      query: {
        esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      },
      timeField: '@timestamp',
      columns: [
        {
          columnId: 'x_date_histogram',
          fieldName: '@timestamp',
          meta: { type: 'date' as const },
        },
      ],
    };

    const result = hydrateEsqlMetricTrendlineAfterSuggestion({
      visualizationType: LENS_METRIC_ID,
      visualizationState: {
        layerId: 'layer_0',
        layerType: 'data',
        metricAccessor: 'metric_accessor_metric',
      },
      textBasedState: {
        layers: {
          layer_0: { ...mainLayer, columns: [] },
        },
      },
      previousVisualizationState,
      previousTextBasedState: {
        layers: {
          layer_0: mainLayer,
          layer_0_trendline: previousTrendlineLayer,
        },
      },
      esqlQuery: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
    });

    expect(result?.visualizationState).toEqual(
      expect.objectContaining({
        trendlineLayerId: 'layer_0_trendline',
        trendlineMetricAccessor: 'metric_accessor_trendline',
        trendlineTimeAccessor: 'x_date_histogram',
      })
    );
    expect(result?.textBasedState.layers.layer_0_trendline).toEqual(previousTrendlineLayer);
  });

  it('does not keep the previous trendline layer when rebuild fails on a different index', () => {
    const previousTrendlineLayer = {
      index: 'esql-logs',
      query: {
        esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      },
      timeField: '@timestamp',
      columns: [
        {
          columnId: 'x_date_histogram',
          fieldName: '@timestamp',
          meta: { type: 'date' as const },
        },
      ],
    };

    const result = hydrateEsqlMetricTrendlineAfterSuggestion({
      visualizationType: LENS_METRIC_ID,
      visualizationState: {
        layerId: 'layer_0',
        layerType: 'data',
        metricAccessor: 'metric_accessor_metric',
      },
      textBasedState: {
        layers: {
          layer_0: { ...mainLayer, index: 'esql-other', columns: [] },
        },
      },
      previousVisualizationState,
      previousTextBasedState: {
        layers: {
          layer_0: mainLayer,
          layer_0_trendline: previousTrendlineLayer,
        },
      },
      esqlQuery: 'FROM other-* | STATS avg_bytes = AVG(bytes)',
    });

    expect(result).toBeUndefined();
  });
});
