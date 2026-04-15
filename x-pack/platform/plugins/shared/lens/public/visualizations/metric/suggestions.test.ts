/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './suggestions';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { MetricVisualizationState } from '@kbn/lens-common';
import { IconChartMetric } from '@kbn/chart-icons';

const metricColumn = {
  columnId: 'metric-column',
  operation: {
    isBucketed: false,
    dataType: 'number' as const,
    scale: 'ratio' as const,
    label: 'Metric',
  },
};

const bucketColumn = {
  columnId: 'top-values-col',
  operation: {
    isBucketed: true,
    dataType: 'string' as const,
    label: 'Top Values',
  },
};

describe('metric suggestions', () => {
  describe('no suggestions', () => {
    test('layer mismatch', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [metricColumn],
            changeType: 'unchanged',
          },
          keptLayerIds: ['unknown-layer'],
        })
      ).toHaveLength(0);
    });

    test('too many bucketed columns', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              bucketColumn,
              // one too many
              {
                ...bucketColumn,
                columnId: 'metric-column2',
              },
            ],
            changeType: 'unchanged',
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    test('too many metric columns', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              metricColumn,
              // one too many
              {
                ...metricColumn,
                columnId: 'metric-column2',
              },
              {
                ...metricColumn,
                columnId: 'metric-column3',
              },
            ],
            changeType: 'unchanged',
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    test('table includes a column of an unsupported format', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [
              metricColumn,
              {
                ...metricColumn,
                columnId: 'metric-column2',
              },
              {
                ...metricColumn,
                columnId: 'metric-column3',
              },
            ],
            changeType: 'unchanged',
          },
          keptLayerIds: ['first'],
        })
      ).toHaveLength(0);
    });

    test('unchanged data when active visualization', () => {
      const unchangedSuggestion = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [metricColumn],
          changeType: 'unchanged' as const,
        },
        state: {
          layerId: 'first',
          layerType: LayerTypes.DATA,
        } as MetricVisualizationState,
        keptLayerIds: ['first'],
      };
      expect(getSuggestions(unchangedSuggestion)).toHaveLength(0);
    });
  });

  describe('when active visualization', () => {
    describe('initial change (e.g. dragging first field to workspace)', () => {
      test('maps metric column to primary metric', () => {
        expect(
          getSuggestions({
            table: {
              layerId: 'first',
              isMultiRow: true,
              columns: [metricColumn],
              changeType: 'initial',
            },
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
            } as MetricVisualizationState,
            keptLayerIds: ['first'],
          })
        ).toEqual([
          {
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              metricAccessor: metricColumn.columnId,
              // should ignore bucketed column for initial drag
            },
            title: 'Metric',
            hide: false,
            previewIcon: IconChartMetric,
            score: 0.51,
          },
        ]);
      });

      test('maps bucketed column to breakdown-by dimension', () => {
        expect(
          getSuggestions({
            table: {
              layerId: 'first',
              isMultiRow: true,
              columns: [bucketColumn],
              changeType: 'initial',
            },
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
            } as MetricVisualizationState,
            keptLayerIds: ['first'],
          })
        ).toEqual([
          {
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              breakdownByAccessor: bucketColumn.columnId,
            },
            title: 'Metric',
            hide: true,
            previewIcon: IconChartMetric,
            score: 0.51,
          },
        ]);
      });

      test('drops mapped columns that do not exist anymore on the table', () => {
        expect(
          getSuggestions({
            table: {
              layerId: 'first',
              isMultiRow: true,
              columns: [bucketColumn],
              changeType: 'initial',
            },
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              metricAccessor: 'non_existent',
            } as MetricVisualizationState,
            keptLayerIds: ['first'],
          })
        ).toEqual([
          {
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              metricAccessor: undefined,
              breakdownByAccessor: bucketColumn.columnId,
            },
            title: 'Metric',
            hide: true,
            previewIcon: IconChartMetric,
            score: 0.51,
          },
        ]);
      });

      test('drops excludes max and secondary metric dimensions from suggestions', () => {
        const suggestedState = getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [metricColumn],
            changeType: 'extended',
          },
          state: {
            layerId: 'first',
            layerType: LayerTypes.DATA,
            secondaryMetricAccessor: 'some-accessor',
            maxAccessor: 'some-accessor',
          } as MetricVisualizationState,
          keptLayerIds: ['first'],
        })[0].state;

        expect(suggestedState.secondaryMetricAccessor).toBeUndefined();
        expect(suggestedState.maxAccessor).toBeUndefined();
      });

      test('no suggestions for tables with both metric and bucket', () => {
        expect(
          getSuggestions({
            table: {
              layerId: 'first',
              isMultiRow: true,
              columns: [metricColumn, bucketColumn],
              changeType: 'initial',
            },
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
            } as MetricVisualizationState,
            keptLayerIds: ['first'],
          })
        ).toHaveLength(0);
      });
    });

    describe('extending (e.g. dragging subsequent fields to workspace)', () => {
      test('maps metric column to primary metric', () => {
        expect(
          getSuggestions({
            table: {
              layerId: 'first',
              isMultiRow: true,
              columns: [bucketColumn, metricColumn],
              changeType: 'extended',
            },
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              breakdownByAccessor: bucketColumn.columnId,
            } as MetricVisualizationState,
            keptLayerIds: ['first'],
          })
        ).toEqual([
          {
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              metricAccessor: metricColumn.columnId,
              breakdownByAccessor: bucketColumn.columnId,
            },
            title: 'Metric',
            hide: true,
            previewIcon: IconChartMetric,
            score: 0.52,
          },
        ]);
      });

      test('maps bucketed column to breakdown-by dimension', () => {
        expect(
          getSuggestions({
            table: {
              layerId: 'first',
              isMultiRow: true,
              columns: [metricColumn, bucketColumn],
              changeType: 'extended',
            },
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              metricAccessor: metricColumn.columnId,
            } as MetricVisualizationState,
            keptLayerIds: ['first'],
          })
        ).toEqual([
          {
            state: {
              layerId: 'first',
              layerType: LayerTypes.DATA,
              metricAccessor: metricColumn.columnId,
              breakdownByAccessor: bucketColumn.columnId,
            },
            title: 'Metric',
            hide: true,
            previewIcon: IconChartMetric,
            score: 0.52,
          },
        ]);
      });
    });
  });

  describe('when NOT active visualization', () => {
    test('maps metric and bucket columns to primary metric and breakdown', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [metricColumn, bucketColumn],
            changeType: 'unchanged', // doesn't matter
          },
          state: undefined,
          keptLayerIds: ['first'],
        })
      ).toEqual([
        {
          state: {
            layerId: 'first',
            layerType: LayerTypes.DATA,
            metricAccessor: metricColumn.columnId,
            breakdownByAccessor: bucketColumn.columnId,
          },
          title: 'Metric',
          hide: true,
          previewIcon: IconChartMetric,
          score: 0.52,
        },
      ]);
    });
  });
});
