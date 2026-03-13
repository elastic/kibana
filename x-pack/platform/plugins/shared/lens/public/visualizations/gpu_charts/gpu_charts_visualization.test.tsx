/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock deck.gl and luma.gl modules to avoid version conflicts in tests
jest.mock('@deck.gl/core', () => ({
  Deck: jest.fn().mockImplementation(() => ({
    setProps: jest.fn(),
    finalize: jest.fn(),
  })),
}));

jest.mock('@deck.gl/layers', () => ({
  ScatterplotLayer: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@deck.gl/aggregation-layers', () => ({
  HexagonLayer: jest.fn().mockImplementation(() => ({})),
}));

import { createMockFramePublicAPI, createMockDatasource } from '../../mocks';
import { getGpuChartsVisualization } from './gpu_charts_visualization';
import type { FramePublicAPI, TableSuggestionColumn } from '@kbn/lens-common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { themeServiceMock } from '@kbn/core/public/mocks';
import type { GpuChartsVisualizationState } from './types';
import { CHART_SHAPES, GROUP_ID } from './constants';

// Mock the GPU capabilities
jest.mock('./gpu_capabilities', () => ({
  isGpuRenderingSupported: jest.fn().mockReturnValue(true),
  detectGpuCapabilities: jest.fn().mockReturnValue({
    webgl2Available: true,
    webgpuAvailable: false,
    maxTextureSize: 16384,
    maxVertexUniformVectors: 4096,
    renderer: 'Mock GPU',
    vendor: 'Mock Vendor',
    hasPerfWarning: false,
  }),
}));

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    datasourceLayers: {},
  };
}

const mockDatasource = createMockDatasource();

function mockFrameWithLayer(layerId: string = 'test-layer'): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    datasourceLayers: {
      [layerId]: mockDatasource.publicAPIMock,
    },
  };
}

const mockServices = {
  paletteService: chartPluginMock.createPaletteRegistry(),
  theme: themeServiceMock.createStartContract(),
};

const gpuChartsVisualization = getGpuChartsVisualization(mockServices);

describe('GPU Charts Visualization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#initialize', () => {
    it('should initialize from the empty state with default values', () => {
      const state = gpuChartsVisualization.initialize(() => 'test-layer', undefined);

      expect(state).toMatchObject({
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
        pointSize: 5,
        pointOpacity: 0.8,
      });
    });

    it('should initialize from a persisted state', () => {
      const expectedState: GpuChartsVisualizationState = {
        layerId: 'persisted-layer',
        layerType: 'data',
        shape: CHART_SHAPES.HEXAGON,
        xAccessor: 'x-col',
        yAccessor: 'y-col',
        hexagonRadius: 2000,
        hexagonElevationScale: 2,
      };

      expect(gpuChartsVisualization.initialize(() => 'new-layer', expectedState)).toEqual(
        expectedState
      );
    });
  });

  describe('#getLayerIds', () => {
    it('should return the layer id', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
      };

      expect(gpuChartsVisualization.getLayerIds(state)).toEqual(['test-layer']);
    });
  });

  describe('#clearLayer', () => {
    it('should reset accessors but keep visual settings', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
        xAccessor: 'x-col',
        yAccessor: 'y-col',
        zAccessor: 'z-col',
        colorAccessor: 'color-col',
        sizeAccessor: 'size-col',
        pointSize: 10,
        pointOpacity: 0.5,
      };

      const clearedState = gpuChartsVisualization.clearLayer(state, 'test-layer', 'test-index');

      expect(clearedState).toMatchObject({
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
        xAccessor: undefined,
        yAccessor: undefined,
        zAccessor: undefined,
        colorAccessor: undefined,
        sizeAccessor: undefined,
      });
    });
  });

  describe('#getDescription', () => {
    it('should return scatter3d description for scatter3d shape', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
      };

      const description = gpuChartsVisualization.getDescription(state);

      expect(description.label).toBe('3D Scatter Plot');
    });

    it('should return hexagon description for hexagon shape', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.HEXAGON,
      };

      const description = gpuChartsVisualization.getDescription(state);

      expect(description.label).toBe('Hexagonal Density');
    });
  });

  describe('#switchVisualizationType', () => {
    it('should switch from scatter3d to hexagon', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
        xAccessor: 'x',
        yAccessor: 'y',
        zAccessor: 'z',
      };

      const newState = gpuChartsVisualization.switchVisualizationType!('gpuHexagon', state);

      expect(newState.shape).toBe(CHART_SHAPES.HEXAGON);
      // Z accessor should be cleared for hexagon
      expect(newState.zAccessor).toBeUndefined();
    });

    it('should switch from hexagon to scatter3d', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.HEXAGON,
        xAccessor: 'x',
        yAccessor: 'y',
      };

      const newState = gpuChartsVisualization.switchVisualizationType!('gpuScatter3d', state);

      expect(newState.shape).toBe(CHART_SHAPES.SCATTER_3D);
    });
  });

  describe('#getConfiguration', () => {
    it('should return configuration with Z-axis for scatter3d', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
      };

      const frame = mockFrameWithLayer('test-layer');
      const config = gpuChartsVisualization.getConfiguration({
        state,
        frame,
        layerId: 'test-layer',
      });

      // Should have X, Y, Z, color, and size groups
      const groupIds = config.groups.map((g) => g.groupId);
      expect(groupIds).toContain(GROUP_ID.X);
      expect(groupIds).toContain(GROUP_ID.Y);
      expect(groupIds).toContain(GROUP_ID.Z);
      expect(groupIds).toContain(GROUP_ID.COLOR);
      expect(groupIds).toContain(GROUP_ID.SIZE);
    });

    it('should return configuration without Z-axis for hexagon', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.HEXAGON,
      };

      const frame = mockFrameWithLayer('test-layer');
      const config = gpuChartsVisualization.getConfiguration({
        state,
        frame,
        layerId: 'test-layer',
      });

      // Should have X, Y, color groups but NOT Z
      const groupIds = config.groups.map((g) => g.groupId);
      expect(groupIds).toContain(GROUP_ID.X);
      expect(groupIds).toContain(GROUP_ID.Y);
      expect(groupIds).toContain(GROUP_ID.COLOR);
      expect(groupIds).not.toContain(GROUP_ID.Z);
    });
  });

  describe('#getSuggestions', () => {
    it('should return empty suggestions for tables with fewer than 2 numeric columns', () => {
      const table = {
        layerId: 'test-layer',
        changeType: 'initial' as const,
        isMultiRow: true,
        columns: [
          {
            columnId: 'col1',
            operation: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Column 1',
            },
          },
        ] as TableSuggestionColumn[],
      };

      const suggestions = gpuChartsVisualization.getSuggestions({
        state: undefined,
        table,
        keptLayerIds: [],
      });

      expect(suggestions).toEqual([]);
    });

    it('should return scatter3d suggestion for tables with 3+ numeric columns', () => {
      const table = {
        layerId: 'test-layer',
        changeType: 'initial' as const,
        isMultiRow: true,
        columns: [
          {
            columnId: 'col1',
            operation: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Column 1',
              scale: 'ratio' as const,
            },
          },
          {
            columnId: 'col2',
            operation: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Column 2',
              scale: 'ratio' as const,
            },
          },
          {
            columnId: 'col3',
            operation: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Column 3',
              scale: 'ratio' as const,
            },
          },
        ] as TableSuggestionColumn[],
      };

      const suggestions = gpuChartsVisualization.getSuggestions({
        state: undefined,
        table,
        keptLayerIds: [],
      });

      // Should have both scatter3d and hexagon suggestions
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      expect(suggestions.some((s) => s.state.shape === CHART_SHAPES.SCATTER_3D)).toBe(true);
      expect(suggestions.some((s) => s.state.shape === CHART_SHAPES.HEXAGON)).toBe(true);
    });

    it('should return only hexagon suggestion for tables with exactly 2 numeric columns', () => {
      const table = {
        layerId: 'test-layer',
        changeType: 'initial' as const,
        isMultiRow: true,
        columns: [
          {
            columnId: 'col1',
            operation: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Column 1',
              scale: 'ratio' as const,
            },
          },
          {
            columnId: 'col2',
            operation: {
              dataType: 'number' as const,
              isBucketed: false,
              label: 'Column 2',
              scale: 'ratio' as const,
            },
          },
        ] as TableSuggestionColumn[],
      };

      const suggestions = gpuChartsVisualization.getSuggestions({
        state: undefined,
        table,
        keptLayerIds: [],
      });

      // Should have only hexagon suggestion (not scatter3d which needs 3 columns)
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].state.shape).toBe(CHART_SHAPES.HEXAGON);
    });
  });

  describe('#getVisualizationTypeId', () => {
    it('should return scatter3d id for scatter3d shape', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
      };

      expect(gpuChartsVisualization.getVisualizationTypeId(state)).toBe('gpuScatter3d');
    });

    it('should return hexagon id for hexagon shape', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.HEXAGON,
      };

      expect(gpuChartsVisualization.getVisualizationTypeId(state)).toBe('gpuHexagon');
    });
  });

  describe('#toExpression', () => {
    it('should return null if required accessors are missing', () => {
      const state: GpuChartsVisualizationState = {
        layerId: 'test-layer',
        layerType: 'data',
        shape: CHART_SHAPES.SCATTER_3D,
        // Missing xAccessor and yAccessor
      };

      const frame = mockFrame();
      const expression = gpuChartsVisualization.toExpression(state, frame.datasourceLayers, {}, {});

      expect(expression).toBeNull();
    });
  });

  describe('#hideFromChartSwitch', () => {
    it('should not hide when GPU rendering is supported', () => {
      const frame = mockFrame();
      expect(gpuChartsVisualization.hideFromChartSwitch?.(frame)).toBe(false);
    });
  });
});
