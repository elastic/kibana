/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, IndexPatternMap, TextBasedPersistedState } from '@kbn/lens-common';
import { LENS_DATASOURCE_ID, LENS_METRIC_ID } from '@kbn/lens-common';
import { createMockedIndexPattern } from '../datasources/form_based/mocks';
import { applyStateHydration } from './apply_hydration';

const visualizationState = {
  layerId: 'layer-1',
  layerType: 'data' as const,
  metricAccessor: 'primary-id',
  secondaryMetricAccessor: 'secondary-id',
  secondaryLabel: 'Custom Name (label)',
};

const formBasedDatasourceStates = (): DatasourceStates => ({
  formBased: {
    isLoading: false,
    state: {
      currentIndexPatternId: 'index-1',
      layers: {
        'layer-1': {
          indexPatternId: 'index-1',
          columnOrder: ['secondary-id'],
          columns: {
            'secondary-id': {
              operationType: 'max',
              sourceField: 'bytes',
              dataType: 'number',
              isBucketed: false,
              label: 'Custom Name',
              customLabel: true,
            },
          },
        },
      },
    },
  },
});

const indexPatterns: IndexPatternMap = {
  'esql-logs': createMockedIndexPattern({ id: 'esql-logs', timeFieldName: '@timestamp' }),
};

const textBasedDatasourceStates = (): DatasourceStates => ({
  [LENS_DATASOURCE_ID.TEXT_BASED]: {
    isLoading: false,
    state: {
      layers: {
        layer_0: {
          columns: [{ columnId: 'col1', fieldName: 'bytes', meta: { type: 'number' } }],
          query: { esql: 'FROM logs-*' },
          index: 'esql-logs',
        },
      },
    },
  },
});

const textBasedLayerTimeField = (datasourceStates: DatasourceStates) =>
  (datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED]?.state as TextBasedPersistedState).layers.layer_0
    .timeField;

const secondaryColumnLabel = (datasourceStates: DatasourceStates) =>
  (
    datasourceStates.formBased.state as {
      layers: Record<string, { columns: Record<string, { label: string }> }>;
    }
  ).layers['layer-1'].columns['secondary-id'].label;

describe('applyStateHydration', () => {
  it('returns the original state for an unknown visualization id', () => {
    const datasourceStates = formBasedDatasourceStates();
    expect(
      applyStateHydration({
        visualizationId: 'lnsXY',
        visualizationState,
        datasourceStates,
        context: 'editor',
      })
    ).toEqual({ visualizationState, datasourceStates });
  });

  it('returns the original state when the visualization id is missing', () => {
    const datasourceStates = formBasedDatasourceStates();
    expect(
      applyStateHydration({
        visualizationId: undefined,
        visualizationState,
        datasourceStates,
        context: 'editor',
      })
    ).toEqual({ visualizationState, datasourceStates });
  });

  it('returns the original state when metric state fails the type guard', () => {
    const datasourceStates = formBasedDatasourceStates();
    const invalidVisualizationState = { notAMetric: true };

    expect(
      applyStateHydration({
        visualizationId: LENS_METRIC_ID,
        visualizationState: invalidVisualizationState,
        datasourceStates,
        context: 'editor',
      })
    ).toEqual({ visualizationState: invalidVisualizationState, datasourceStates });
  });

  it('runs the editor sequence, including the secondary-label migration', () => {
    const result = applyStateHydration({
      visualizationId: LENS_METRIC_ID,
      visualizationState,
      datasourceStates: formBasedDatasourceStates(),
      context: 'editor',
    });

    expect(result.visualizationState).not.toHaveProperty('secondaryLabel');
    expect(secondaryColumnLabel(result.datasourceStates)).toBe('Custom Name (label)');
  });

  it('skips the secondary-label migration on the expression path', () => {
    const datasourceStates = formBasedDatasourceStates();
    const result = applyStateHydration({
      visualizationId: LENS_METRIC_ID,
      visualizationState,
      datasourceStates,
      context: 'expression',
    });

    expect(result.visualizationState).toEqual(visualizationState);
    expect(secondaryColumnLabel(result.datasourceStates)).toBe('Custom Name');
  });

  it('hydrates text-based layer time fields for a non-metric visualization when indexPatterns are passed', () => {
    const datasourceStates = textBasedDatasourceStates();
    const result = applyStateHydration({
      visualizationId: 'lnsXY',
      visualizationState: { layers: [] },
      datasourceStates,
      context: 'editor',
      indexPatterns,
    });

    expect(textBasedLayerTimeField(result.datasourceStates)).toBe('@timestamp');
    expect(result.visualizationState).toEqual({ layers: [] });
  });

  it('skips text-based time-field hydration when there is no text-based datasource', () => {
    const datasourceStates = formBasedDatasourceStates();
    const result = applyStateHydration({
      visualizationId: 'lnsXY',
      visualizationState: { layers: [] },
      datasourceStates,
      context: 'editor',
      indexPatterns,
    });

    expect(result).toEqual({
      visualizationState: { layers: [] },
      datasourceStates,
    });
  });

  it('skips text-based time-field hydration when indexPatterns are omitted', () => {
    const datasourceStates = textBasedDatasourceStates();
    const result = applyStateHydration({
      visualizationId: 'lnsXY',
      visualizationState: { layers: [] },
      datasourceStates,
      context: 'editor',
    });

    expect(result).toEqual({
      visualizationState: { layers: [] },
      datasourceStates,
    });
    expect(textBasedLayerTimeField(result.datasourceStates)).toBeUndefined();
  });

  it.each(['editor', 'expression'] as const)(
    'rebuilds a missing ES|QL metric trendline on the %s path',
    (context) => {
      const metricVisualizationState = {
        layerId: 'layer_0',
        layerType: 'data' as const,
        metricAccessor: 'metric_accessor_metric',
        trendlineLayerId: 'layer_0_trendline',
        trendlineLayerType: 'metricTrendline' as const,
        trendlineMetricAccessor: 'metric_accessor_trendline',
        trendlineTimeAccessor: 'x_date_histogram',
      };
      const datasourceStates: DatasourceStates = {
        [LENS_DATASOURCE_ID.TEXT_BASED]: {
          isLoading: false,
          state: {
            layers: {
              layer_0: {
                index: 'esql-logs',
                query: { esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes)' },
                columns: [
                  {
                    columnId: 'metric_accessor_metric',
                    fieldName: 'avg_bytes',
                    meta: { type: 'number' },
                  },
                ],
              },
            },
          },
        },
      };

      const result = applyStateHydration({
        visualizationId: LENS_METRIC_ID,
        visualizationState: metricVisualizationState,
        datasourceStates,
        context,
        indexPatterns,
      });

      const layers = (
        result.datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED]?.state as TextBasedPersistedState
      ).layers;

      expect(layers.layer_0.timeField).toBe('@timestamp');
      expect(layers.layer_0_trendline.query?.esql).toContain('BUCKET');
    }
  );

  it('rebuilds a trendline whose query still uses a stale time field after time-field backfill', () => {
    const metricVisualizationState = {
      layerId: 'layer_0',
      layerType: 'data' as const,
      metricAccessor: 'metric_accessor_metric',
      trendlineLayerId: 'layer_0_trendline',
      trendlineLayerType: 'metricTrendline' as const,
      trendlineMetricAccessor: 'metric_accessor_trendline',
      trendlineTimeAccessor: 'x_date_histogram',
    };
    const datasourceStates: DatasourceStates = {
      [LENS_DATASOURCE_ID.TEXT_BASED]: {
        isLoading: false,
        state: {
          layers: {
            layer_0: {
              index: 'esql-logs',
              query: { esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes)' },
              columns: [
                {
                  columnId: 'metric_accessor_metric',
                  fieldName: 'avg_bytes',
                  meta: { type: 'number' },
                },
              ],
            },
            layer_0_trendline: {
              index: 'esql-logs',
              query: {
                esql: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY BUCKET(order_date, 1 hour)',
              },
              columns: [
                {
                  columnId: 'x_date_histogram',
                  fieldName: 'order_date',
                  meta: { type: 'date' },
                },
              ],
            },
          },
        },
      },
    };

    const result = applyStateHydration({
      visualizationId: LENS_METRIC_ID,
      visualizationState: metricVisualizationState,
      datasourceStates,
      context: 'expression',
      indexPatterns,
    });

    const trendlineLayer = (
      result.datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED]?.state as TextBasedPersistedState
    ).layers.layer_0_trendline;

    expect(trendlineLayer.timeField).toBe('@timestamp');
    expect(trendlineLayer.query?.esql).toContain('BUCKET');
    expect(trendlineLayer.query?.esql).not.toContain('order_date');
  });
});
