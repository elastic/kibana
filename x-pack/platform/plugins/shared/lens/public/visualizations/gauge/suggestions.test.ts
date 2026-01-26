/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './suggestions';
import {
  IconChartVerticalBullet,
  IconChartHorizontalBullet,
  IconChartGaugeSemiCircle,
  IconChartGaugeArc,
  IconChartGaugeCircle,
} from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import type { GaugeVisualizationState } from './constants';
import { DEFAULT_PALETTE } from './palette_config';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';

const stops = [
  {
    color: 'blue',
    stop: 0,
  },
  {
    color: 'red',
    stop: 25,
  },
  {
    color: 'yellow',
    stop: 50,
  },
  {
    color: 'green',
    stop: 75,
  },
];
const MOCKED_DEFAULT_COLOR_PALETTE = {
  ...DEFAULT_PALETTE,
  params: {
    ...DEFAULT_PALETTE.params,
    stops,
  },
};

jest.mock('@kbn/coloring', () => ({
  ...jest.requireActual('@kbn/coloring'),
  applyPaletteParams: jest.fn().mockReturnValue(stops),
}));

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
  columnId: 'date-column-01',
  operation: {
    isBucketed: true,
    dataType: 'date' as const,
    scale: 'interval' as const,
    label: 'Date',
  },
};

const paletteService = chartPluginMock.createPaletteRegistry();

describe('gauge suggestions', () => {
  describe('rejects suggestions', () => {
    test('when currently active and unchanged data', () => {
      const unchangedSuggestion = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [],
          changeType: 'unchanged' as const,
        },
        state: {
          shape: GaugeShapes.HORIZONTAL_BULLET,
          layerId: 'first',
          layerType: LayerTypes.DATA,
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
        paletteService,
      };
      expect(getSuggestions(unchangedSuggestion)).toHaveLength(0);
    });
    test('when there are buckets', () => {
      const bucketAndMetricSuggestion = {
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [bucketColumn, metricColumn],
          changeType: 'initial' as const,
        },
        state: {
          layerId: 'first',
          layerType: LayerTypes.DATA,
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
        paletteService,
      };
      expect(getSuggestions(bucketAndMetricSuggestion)).toEqual([]);
    });
    test('when currently active with partial configuration', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [metricColumn],
            changeType: 'initial',
          },
          state: {
            shape: GaugeShapes.HORIZONTAL_BULLET,
            layerId: 'first',
            layerType: LayerTypes.DATA,
            minAccessor: 'some-field',
            labelMajorMode: 'auto',
            ticksPosition: 'auto',
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
          paletteService,
        })
      ).toHaveLength(0);
    });
    test('for tables with a single bucket dimension', () => {
      expect(
        getSuggestions({
          table: {
            layerId: 'first',
            isMultiRow: true,
            columns: [bucketColumn],
            changeType: 'reduced',
          },
          state: {
            layerId: 'first',
            layerType: LayerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
          paletteService,
        })
      ).toEqual([]);
    });
    test('when two metric accessor are available', () => {
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
            ],
            changeType: 'initial',
          },
          state: {
            layerId: 'first',
            layerType: LayerTypes.DATA,
          } as GaugeVisualizationState,
          keptLayerIds: ['first'],
          paletteService,
        })
      ).toEqual([]);
    });
  });
});

describe('shows suggestions', () => {
  test('when complete configuration has been resolved', () => {
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
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
        paletteService,
      })
    ).toEqual([
      {
        state: {
          colorMode: 'palette',
          palette: MOCKED_DEFAULT_COLOR_PALETTE,
          layerId: 'first',
          layerType: LayerTypes.DATA,
          shape: GaugeShapes.HORIZONTAL_BULLET,
          metricAccessor: 'metric-column',
          labelMajorMode: 'auto',
          ticksPosition: 'bands',
        },
        title: 'Gauge',
        hide: true,
        incomplete: true,
        previewIcon: IconChartHorizontalBullet,
        score: 0.5,
      },
      {
        hide: true,
        incomplete: true,
        previewIcon: IconChartVerticalBullet,
        title: 'Gauge',
        score: 0.5,
        state: {
          colorMode: 'palette',
          palette: MOCKED_DEFAULT_COLOR_PALETTE,
          layerId: 'first',
          layerType: 'data',
          metricAccessor: 'metric-column',
          shape: GaugeShapes.VERTICAL_BULLET,
          ticksPosition: 'bands',
          labelMajorMode: 'auto',
        },
      },
    ]);
  });
  test('passes the state when change is shape change', () => {
    expect(
      getSuggestions({
        table: {
          layerId: 'first',
          isMultiRow: true,
          columns: [metricColumn],
          changeType: 'extended',
        },
        state: {
          layerId: 'first',
          layerType: LayerTypes.DATA,
          shape: GaugeShapes.HORIZONTAL_BULLET,
          metricAccessor: 'metric-column',
        } as GaugeVisualizationState,
        keptLayerIds: ['first'],
        subVisualizationId: GaugeShapes.VERTICAL_BULLET,
        paletteService,
      })
    ).toEqual([
      {
        state: {
          colorMode: 'palette',
          palette: MOCKED_DEFAULT_COLOR_PALETTE,
          layerType: LayerTypes.DATA,
          shape: GaugeShapes.VERTICAL_BULLET,
          metricAccessor: 'metric-column',
          labelMajorMode: 'auto',
          ticksPosition: 'bands',
          layerId: 'first',
        },
        previewIcon: IconChartVerticalBullet,
        title: 'Vertical Bullet',
        hide: false, // shows suggestion when current is gauge
        incomplete: false,
        score: 1,
      },
      {
        hide: false,
        incomplete: false,
        previewIcon: IconChartGaugeSemiCircle,
        score: 0.1,
        state: {
          colorMode: 'palette',
          palette: MOCKED_DEFAULT_COLOR_PALETTE,
          labelMajorMode: 'auto',
          layerId: 'first',
          layerType: 'data',
          metricAccessor: 'metric-column',
          shape: 'semiCircle',
          ticksPosition: 'bands',
        },
        title: 'Minor arc',
      },
      {
        hide: false,
        incomplete: false,
        previewIcon: IconChartGaugeArc,
        score: 0.5,
        state: {
          colorMode: 'palette',
          palette: MOCKED_DEFAULT_COLOR_PALETTE,
          labelMajorMode: 'auto',
          layerId: 'first',
          layerType: 'data',
          metricAccessor: 'metric-column',
          shape: 'arc',
          ticksPosition: 'bands',
        },
        title: 'Major arc',
      },
      {
        hide: false,
        incomplete: false,
        previewIcon: IconChartGaugeCircle,
        score: 0.1,
        state: {
          colorMode: 'palette',
          palette: MOCKED_DEFAULT_COLOR_PALETTE,
          labelMajorMode: 'auto',
          layerId: 'first',
          layerType: 'data',
          metricAccessor: 'metric-column',
          shape: 'circle',
          ticksPosition: 'bands',
        },
        title: 'Circle',
      },
    ]);
  });
});
