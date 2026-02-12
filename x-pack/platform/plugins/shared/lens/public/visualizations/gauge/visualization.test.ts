/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import { getGaugeVisualization, isNumericDynamicMetric, isNumericMetric } from './visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { GROUP_ID } from './constants';
import { DEFAULT_PALETTE } from './palette_config';
import type { DatasourceLayers, OperationDescriptor } from '@kbn/lens-common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { GaugeVisualizationState } from './constants';

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

jest.mock('@kbn/coloring', () => ({
  ...jest.requireActual('@kbn/coloring'),
  applyPaletteParams: jest.fn().mockReturnValue(stops),
}));

function exampleState(): GaugeVisualizationState {
  return {
    layerId: 'test-layer',
    layerType: LayerTypes.DATA,
    labelMajorMode: 'auto',
    ticksPosition: 'auto',
    shape: 'horizontalBullet',
  };
}

const deps = {
  paletteService: chartPluginMock.createPaletteRegistry(),
};

describe('gauge', () => {
  let frame: ReturnType<typeof createMockFramePublicAPI>;

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    jest.restoreAllMocks();
  });

  describe('#intialize', () => {
    test('returns a default state', () => {
      expect(getGaugeVisualization(deps).initialize(() => 'l1')).toEqual({
        layerId: 'l1',
        layerType: LayerTypes.DATA,
        shape: 'horizontalBullet',
        labelMajorMode: 'auto',
        ticksPosition: 'bands',
        colorMode: 'palette',
        palette: {
          ...DEFAULT_PALETTE,
          params: {
            ...DEFAULT_PALETTE.params,
            stops,
          },
        },
      });
    });

    test('returns persisted state', () => {
      expect(getGaugeVisualization(deps).initialize(() => 'test-layer', exampleState())).toEqual(
        exampleState()
      );
    });
  });

  describe('#getConfiguration', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource();

      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    afterEach(() => {
      // some tests manipulate it, so restore a pristine version
      frame = createMockFramePublicAPI();
    });

    test('resolves configuration from complete state and available data', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
        goalAccessor: 'goal-accessor',
      };
      frame.activeData = {
        first: { type: 'datatable', columns: [], rows: [{ 'metric-accessor': 200 }] },
      };

      expect(
        getGaugeVisualization(deps).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
            },
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            isMetricDimension: true,
            accessors: [{ columnId: 'metric-accessor', triggerIconType: 'none' }],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: false,
            requiredMinDimensionCount: 1,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            enableFormatSelector: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Minimum value'],
            },
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            isMetricDimension: true,
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            enableFormatSelector: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Maximum value'],
            },
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            isMetricDimension: true,
            accessors: [{ columnId: 'max-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            enableFormatSelector: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Goal value'],
            },
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            isMetricDimension: true,
            accessors: [{ columnId: 'goal-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            requiredMinDimensionCount: 0,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            enableFormatSelector: false,
            supportStaticValue: true,
          },
        ],
      });
    });

    test('resolves configuration from partial state', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'min-accessor',
      };
      expect(
        getGaugeVisualization(deps).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
            },
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            isMetricDimension: true,
            accessors: [],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: true,
            requiredMinDimensionCount: 1,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            enableFormatSelector: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Minimum value'],
            },
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            isMetricDimension: true,
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            enableFormatSelector: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Maximum value'],
            },
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            isMetricDimension: true,
            accessors: [],
            filterOperations: isNumericMetric,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            enableFormatSelector: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Goal value'],
            },
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            isMetricDimension: true,
            accessors: [],
            filterOperations: isNumericMetric,
            supportsMoreColumns: true,
            requiredMinDimensionCount: 0,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            enableFormatSelector: false,
            supportStaticValue: true,
          },
        ],
      });
    });

    test("resolves configuration when there's no access to active data in frame", () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
        goalAccessor: 'goal-accessor',
      };

      frame.activeData = undefined;

      expect(
        getGaugeVisualization(deps).getConfiguration({ state, frame, layerId: 'first' })
      ).toEqual({
        groups: [
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
            },
            groupId: GROUP_ID.METRIC,
            groupLabel: 'Metric',
            isMetricDimension: true,
            accessors: [{ columnId: 'metric-accessor', triggerIconType: 'none' }],
            filterOperations: isNumericDynamicMetric,
            supportsMoreColumns: false,
            requiredMinDimensionCount: 1,
            dataTestSubj: 'lnsGauge_metricDimensionPanel',
            enableDimensionEditor: true,
            enableFormatSelector: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Minimum value'],
            },
            groupId: GROUP_ID.MIN,
            groupLabel: 'Minimum value',
            isMetricDimension: true,
            accessors: [{ columnId: 'min-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_minDimensionPanel',
            prioritizedOperation: 'min',
            suggestedValue: expect.any(Function),
            enableFormatSelector: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Maximum value'],
            },
            groupId: GROUP_ID.MAX,
            groupLabel: 'Maximum value',
            isMetricDimension: true,
            accessors: [{ columnId: 'max-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGauge_maxDimensionPanel',
            prioritizedOperation: 'max',
            suggestedValue: expect.any(Function),
            enableFormatSelector: false,
            supportStaticValue: true,
          },
          {
            layerId: 'first',
            paramEditorCustomProps: {
              headingLabel: 'Value',
              labels: ['Goal value'],
            },
            groupId: GROUP_ID.GOAL,
            groupLabel: 'Goal value',
            isMetricDimension: true,
            accessors: [{ columnId: 'goal-accessor' }],
            filterOperations: isNumericMetric,
            supportsMoreColumns: false,
            requiredMinDimensionCount: 0,
            dataTestSubj: 'lnsGauge_goalDimensionPanel',
            enableFormatSelector: false,
            supportStaticValue: true,
          },
        ],
      });
    });
  });

  describe('#setDimension', () => {
    test('set dimension correctly', () => {
      const prevState: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
      };
      expect(
        getGaugeVisualization(deps).setDimension({
          prevState,
          layerId: 'first',
          columnId: 'new-min-accessor',
          groupId: 'min',
          frame,
        })
      ).toEqual({
        ...prevState,
        minAccessor: 'new-min-accessor',
      });
    });
  });

  describe('#removeDimension', () => {
    const prevState: GaugeVisualizationState = {
      ...exampleState(),
      metricAccessor: 'metric-accessor',
      minAccessor: 'min-accessor',
      palette: [] as unknown as PaletteOutput<CustomPaletteParams>,
      colorMode: 'palette',
      ticksPosition: 'bands',
    };
    test('removes metric correctly', () => {
      expect(
        getGaugeVisualization(deps).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'metric-accessor',
          frame,
        })
      ).toEqual({
        ...exampleState(),
        minAccessor: 'min-accessor',
      });
    });
    test('removes min correctly', () => {
      expect(
        getGaugeVisualization(deps).removeDimension({
          prevState,
          layerId: 'first',
          columnId: 'min-accessor',
          frame,
        })
      ).toEqual({
        ...exampleState(),
        metricAccessor: 'metric-accessor',
        palette: [] as unknown as PaletteOutput<CustomPaletteParams>,
        colorMode: 'palette',
        ticksPosition: 'bands',
      });
    });
  });
  describe('#getSupportedLayers', () => {
    it('should return a single layer type', () => {
      expect(getGaugeVisualization(deps).getSupportedLayers()).toHaveLength(1);
    });
  });
  describe('#getLayerType', () => {
    it('should return the type only if the layer is in the state', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        minAccessor: 'min-accessor',
        goalAccessor: 'value-accessor',
      };
      const instance = getGaugeVisualization(deps);
      expect(instance.getLayerType('test-layer', state)).toEqual(LayerTypes.DATA);
      expect(instance.getLayerType('foo', state)).toBeUndefined();
    });
  });

  describe('#toExpression', () => {
    let datasourceLayers: DatasourceLayers;
    beforeEach(() => {
      const mockDatasource = createMockDatasource();
      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);
      datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });
    test('creates an expression based on state and attributes', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'min-accessor',
        goalAccessor: 'goal-accessor',
        metricAccessor: 'metric-accessor',
        maxAccessor: 'max-accessor',
        labelMinor: 'Subtitle',
      };
      expect(getGaugeVisualization(deps).toExpression(state, datasourceLayers)).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'gauge',
            arguments: {
              metric: ['metric-accessor'],
              min: ['min-accessor'],
              max: ['max-accessor'],
              goal: ['goal-accessor'],
              colorMode: ['none'],
              ticksPosition: ['auto'],
              labelMajorMode: ['auto'],
              labelMinor: ['Subtitle'],
              shape: ['horizontalBullet'],
            },
          },
        ],
      });
    });
    test('returns null with a missing metric accessor', () => {
      const state: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        minAccessor: 'min-accessor',
      };
      expect(getGaugeVisualization(deps).toExpression(state, datasourceLayers)).toEqual(null);
    });
  });

  describe('#getUserMessages', () => {
    beforeEach(() => {
      const mockDatasource = createMockDatasource();
      mockDatasource.publicAPIMock.getOperationForColumnId.mockReturnValue({
        dataType: 'string',
        label: 'MyOperation',
      } as OperationDescriptor);
      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });
    const state: GaugeVisualizationState = {
      ...exampleState(),
      layerId: 'first',
      metricAccessor: 'metric-accessor',
      minAccessor: 'min-accessor',
      maxAccessor: 'max-accessor',
      goalAccessor: 'goal-accessor',
    };

    it('should report error when max < minimum', () => {
      const localState: GaugeVisualizationState = {
        ...exampleState(),
        layerId: 'first',
        metricAccessor: 'metric-accessor',
        minAccessor: 'min-accessor',
        maxAccessor: 'max-accessor',
        goalAccessor: 'goal-accessor',
      };
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [{ 'min-accessor': 10, 'max-accessor': 0 }],
        },
      };

      expect(getGaugeVisualization(deps).getUserMessages!(localState, { frame }))
        .toMatchInlineSnapshot(`
        Array [
          Object {
            "displayLocations": Array [
              Object {
                "dimensionId": "min-accessor",
                "id": "dimensionButton",
              },
              Object {
                "dimensionId": "max-accessor",
                "id": "dimensionButton",
              },
            ],
            "fixableInEditor": true,
            "longMessage": "",
            "severity": "error",
            "shortMessage": "Minimum value may not be greater than maximum value",
            "uniqueId": "gauge_min_gt_max",
          },
        ]
      `);
    });

    it('should not warn for data in bounds', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'min-accessor': 0,
              'metric-accessor': 5,
              'max-accessor': 10,
              'goal-accessor': 8,
            },
          ],
        },
      };

      expect(getGaugeVisualization(deps).getUserMessages!(state, { frame })).toHaveLength(0);
    });
    it('should warn when minimum value is greater than metric value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': -1,
              'min-accessor': 1,
              'max-accessor': 3,
              'goal-accessor': 2,
            },
          ],
        },
      };

      expect(getGaugeVisualization(deps).getUserMessages!(state, { frame })).toHaveLength(1);
    });

    it('should warn when metric value is greater than maximum value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': 10,
              'min-accessor': -10,
              'max-accessor': 0,
            },
          ],
        },
      };

      expect(getGaugeVisualization(deps).getUserMessages!(state, { frame })).toHaveLength(1);
    });
    it('should warn when goal value is greater than maximum value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': 5,
              'min-accessor': 0,
              'max-accessor': 10,
              'goal-accessor': 15,
            },
          ],
        },
      };

      expect(getGaugeVisualization(deps).getUserMessages!(state, { frame })).toHaveLength(1);
    });
    it('should warn when minimum value is greater than goal value', () => {
      frame.activeData = {
        first: {
          type: 'datatable',
          columns: [],
          rows: [
            {
              'metric-accessor': 5,
              'min-accessor': 0,
              'max-accessor': 10,
              'goal-accessor': -5,
            },
          ],
        },
      };

      expect(getGaugeVisualization(deps).getUserMessages!(state, { frame })).toHaveLength(1);
    });
  });
});
