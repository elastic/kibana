/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

import { encode } from '../../common/lib/embeddable_dataurl';
import { DEFAULT_TIME_RANGE } from '../../common/lib';
import { embeddableService, expressionsService, logger } from '../kibana_services';

import { transformWorkpadOut } from './transform_workpad_out';
import { makeWorkpad, getDecodedConfig, getExpressionFunctionName } from './fixtures';
import type { AstFunction } from '@kbn/interpreter';
import { fromExpression } from '@kbn/interpreter';

const mockLensTransforms = {
  transformIn: jest.fn((config: any) => {
    const { savedObjectId, ...state } = config;
    return {
      state,
      references: [{ id: savedObjectId, name: 'savedObjectRef', type: 'lens' }],
    };
  }),
  transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
    return { ...config, savedObjectId: references[0].id };
  }),
};

const mockVisualizationTransforms = {
  transformIn: jest.fn((config: any) => {
    const { savedObjectId, ...state } = config;
    return {
      state,
      references: [{ id: savedObjectId, name: 'savedObjectRef', type: 'visualization' }],
    };
  }),
  transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
    return { ...config, savedObjectId: references[0].id };
  }),
};

const mockMapTransforms = {
  transformIn: jest.fn((config: any) => {
    const { savedObjectId, ...state } = config;
    return {
      state,
      references: [{ id: savedObjectId, name: 'savedObjectRef', type: 'map' }],
    };
  }),
  transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
    return { ...config, savedObjectId: references[0].id };
  }),
};

jest.mock('../kibana_services', () => ({
  embeddableService: {
    getTransforms: jest.fn((type: string) => {
      switch (type) {
        case 'lens':
          return mockLensTransforms;
        case 'visualization':
          return mockVisualizationTransforms;
        case 'map':
          return mockMapTransforms;
      }
    }),
  },
  logger: {
    error: jest.fn(),
  },
  expressionsService: {
    inject: jest.fn().mockImplementation((ast, references) => {
      if (references.length === 0) {
        return ast;
      }
      return {
        ...ast,
        chain: ast.chain.map((fn: AstFunction) => {
          if (
            fn.function === 'savedLens' ||
            fn.function === 'savedVisualization' ||
            fn.function === 'savedMap'
          ) {
            return { ...fn, arguments: { ...fn.arguments, id: [references[0].id] } };
          }

          return fn;
        }),
      };
    }),
  },
}));

describe('transformWorkpadOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not apply transforms to non-embeddable elements', () => {
    const expression = 'shape "square" | render';
    transformWorkpadOut(makeWorkpad(expression), []);
    expect(expressionsService.inject).not.toHaveBeenCalledWith(fromExpression(expression), []);
    expect(embeddableService?.getTransforms).not.toHaveBeenCalled();
  });

  it('applies transformOut to embeddable config', () => {
    const expression = `embeddable type="lens" config="${encode({
      title: 'Test lens embeddable',
      savedObjectId: 'test-id',
    })}" | render`;
    const workpad = makeWorkpad(expression);

    const references = [
      { id: 'test-id', name: 'element-id:savedObjectRef', type: 'lens' },
    ] as SavedObjectReference[];

    const transformedWorkpad = transformWorkpadOut(workpad, references);
    expect(getDecodedConfig(transformedWorkpad)).toEqual({
      title: 'Test lens embeddable',
      savedObjectId: 'test-id',
    });

    expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
      { title: 'Test lens embeddable' },
      [{ id: 'test-id', name: 'savedObjectRef', type: 'lens' }]
    );
  });

  describe('legacy expressions', () => {
    describe('savedLens', () => {
      it('migrates savedLens to an embeddable expression with transforms applied', () => {
        const expression = 'savedLens id="lens-id" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'lens-id', name: 'element-id:savedLens.id', type: 'lens' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'lens-id',
        });
        expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens');
        expect(mockLensTransforms.transformIn).toHaveBeenCalledWith({
          savedObjectId: 'lens-id',
          timeRange: DEFAULT_TIME_RANGE,
        });
        expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
          { timeRange: DEFAULT_TIME_RANGE },
          [{ id: 'lens-id', name: 'savedObjectRef', type: 'lens' }]
        );
      });

      it('migrates savedLens with an explicit title', () => {
        const expression = 'savedLens id="lens-id" title="My Lens" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'lens-id', name: 'element-id:savedObjectRef', type: 'lens' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          title: 'My Lens',
          savedObjectId: 'lens-id',
        });
      });

      it('migrates savedLens with an explicit timerange', () => {
        const expression =
          'savedLens id="lens-id" timerange={timerange from="now-7d" to="now"} | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'lens-id', name: 'element-id:savedObjectRef', type: 'lens' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual(
          expect.objectContaining({ timeRange: { from: 'now-7d', to: 'now' } })
        );
      });

      it('migrates savedLens with an explicit saved object id without references', () => {
        const expression = 'savedLens id="lens-id" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, []);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'lens-id',
        });
      });

      it('uses expressions service to inject references for savedLens', () => {
        const expression = 'savedLens id="savedLens.id" | render';

        const transformedWorkpad = transformWorkpadOut(makeWorkpad(expression), [
          { id: 'lens-id', name: 'element-id:savedLens.id', type: 'lens' },
        ]);

        expect(expressionsService.inject).toHaveBeenCalledWith(fromExpression(expression), [
          {
            id: 'lens-id',
            name: 'savedLens.id',
            type: 'lens',
          },
        ]);
        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'lens-id',
        });
      });
    });

    describe('savedVisualization', () => {
      it('migrates savedVisualization to an embeddable expression with transforms applied', () => {
        const expression = 'savedVisualization id="savedVisualization.id" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'vis-id', name: 'element-id:savedVisualization.id', type: 'visualization' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'vis-id',
        });
        expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
        expect(mockVisualizationTransforms.transformIn).toHaveBeenCalledWith({
          savedObjectId: 'vis-id',
          timeRange: DEFAULT_TIME_RANGE,
        });
        expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
          { timeRange: DEFAULT_TIME_RANGE },
          [{ id: 'vis-id', name: 'savedObjectRef', type: 'visualization' }]
        );
      });

      it('migrates savedVisualization with an explicit title', () => {
        const expression = 'savedVisualization id="vis-id" title="My Viz" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'vis-id', name: 'element-id:savedObjectRef', type: 'visualization' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          title: 'My Viz',
          savedObjectId: 'vis-id',
        });
      });

      it('migrates savedVisualization with an explicit timerange', () => {
        const expression =
          'savedVisualization id="vis-id" timerange={timerange from="now-7d" to="now"} | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'vis-id', name: 'element-id:savedObjectRef', type: 'visualization' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual(
          expect.objectContaining({ timeRange: { from: 'now-7d', to: 'now' } })
        );
      });

      it('migrates savedVisualization with hideLegend=true', () => {
        const expression = 'savedVisualization id="vis-id" hideLegend=true | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'vis-id', name: 'element-id:savedObjectRef', type: 'visualization' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'vis-id',
          vis: {
            legendOpen: false,
          },
        });
      });

      it('migrates savedVisualization with an hideLegend=false', () => {
        const expression = 'savedVisualization id="vis-id" hideLegend=false | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'vis-id', name: 'element-id:savedObjectRef', type: 'visualization' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'vis-id',
          vis: {
            legendOpen: true,
          },
        });
      });

      it('migrates savedVisualization with an explicit saved object id without references', () => {
        const expression = 'savedVisualization id="vis-id" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, []);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'vis-id',
        });
      });

      it('uses expressions service to inject references for savedVisualization', () => {
        const expression = 'savedVisualization id="savedVisualization.id" | render';

        const transformedWorkpad = transformWorkpadOut(makeWorkpad(expression), [
          {
            id: 'visualization-id',
            name: 'element-id:savedVisualization.id',
            type: 'visualization',
          },
        ]);

        expect(expressionsService.inject).toHaveBeenCalledWith(fromExpression(expression), [
          {
            id: 'visualization-id',
            name: 'savedVisualization.id',
            type: 'visualization',
          },
        ]);
        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'visualization-id',
        });
      });
    });

    describe('savedMap', () => {
      it('migrates savedMap to an embeddable expression with transforms applied', () => {
        const expression = 'savedMap id="map-id" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'map-id', name: 'element-id:savedObjectRef', type: 'map' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'map-id',
          hiddenLayers: [],
        });
        expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
        expect(mockMapTransforms.transformIn).toHaveBeenCalledWith({
          savedObjectId: 'map-id',
          timeRange: DEFAULT_TIME_RANGE,
          hiddenLayers: [],
        });
        expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
          {
            timeRange: DEFAULT_TIME_RANGE,
            hiddenLayers: [],
          },
          [{ id: 'map-id', name: 'savedObjectRef', type: 'map' }]
        );
      });

      it('migrates savedMap with an explicit title', () => {
        const expression = 'savedMap id="map-id" title="My Map" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'map-id', name: 'element-id:savedObjectRef', type: 'map' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'map-id',
          hiddenLayers: [],
          title: 'My Map',
        });
        expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      });

      it('migrates savedMap with an explicit timerange', () => {
        const expression =
          'savedMap id="map-id" timerange={timerange from="now-7d" to="now"} | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'map-id', name: 'element-id:savedObjectRef', type: 'map' },
        ]);
        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: { from: 'now-7d', to: 'now' },
          savedObjectId: 'map-id',
          hiddenLayers: [],
        });
      });

      it('migrates savedMap with an explicit hideLayer', () => {
        const expression =
          'savedMap id="map-id" hideLayer="layer-id-1" hideLayer="layer-id-2" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'map-id', name: 'element-id:savedObjectRef', type: 'map' },
        ]);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'map-id',
          hiddenLayers: ['layer-id-1', 'layer-id-2'],
        });
      });

      it('migrates savedMap with an explicit center', () => {
        const expression =
          'savedMap id="map-id" center={mapCenter lat=37.7749 lon=-122.4194 zoom=12} | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, [
          { id: 'map-id', name: 'element-id:savedObjectRef', type: 'map' },
        ]);
        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'map-id',
          mapCenter: {
            lat: 37.7749,
            lon: -122.4194,
            zoom: 12,
          },
          hiddenLayers: [],
        });
      });

      it('migrates savedMap with an explicit saved object id without references', () => {
        const expression = 'savedMap id="map-id" | render';
        const workpad = makeWorkpad(expression);

        const transformedWorkpad = transformWorkpadOut(workpad, []);

        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'map-id',
          hiddenLayers: [],
        });
      });

      it('uses expressions service to inject references for savedMap', () => {
        const expression = 'savedMap id="savedMap.id" | render';
        const references = [{ id: 'map-id', name: 'element-id:savedMap.id', type: 'map' }];

        const transformedWorkpad = transformWorkpadOut(makeWorkpad(expression), references);

        expect(expressionsService.inject).toHaveBeenCalledWith(fromExpression(expression), [
          {
            id: 'map-id',
            name: 'savedMap.id',
            type: 'map',
          },
        ]);
        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'map-id',
          hiddenLayers: [],
        });
      });
    });

    describe('embeddable', () => {
      it('migrates embeddable with an explicit saved object id without references', () => {
        const expression = `embeddable type="lens" config="${encode({
          savedObjectId: 'embeddable-id',
          timeRange: DEFAULT_TIME_RANGE,
        })}" | render`;
        const workpad = makeWorkpad(expression);
        const transformedWorkpad = transformWorkpadOut(workpad, []);
        expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
        expect(getDecodedConfig(transformedWorkpad)).toEqual({
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'embeddable-id',
        });
        expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens');
        expect(mockLensTransforms.transformIn).toHaveBeenCalledWith({
          savedObjectId: 'embeddable-id',
          timeRange: DEFAULT_TIME_RANGE,
        });
        expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
          { timeRange: DEFAULT_TIME_RANGE },
          [{ id: 'embeddable-id', name: 'savedObjectRef', type: 'lens' }]
        );
      });
    });
  });

  it('logs and re-throws errors when transformation fails', () => {
    const error = new Error('Transform failed');
    (embeddableService.getTransforms as jest.Mock).mockImplementationOnce(() => {
      throw error;
    });

    const expression = `embeddable type="lens" config="${encode({ title: 'Test' })}" | render`;
    const workpad = makeWorkpad(expression);

    expect(() => transformWorkpadOut(workpad, [])).toThrow(error);
    expect(logger.error).toHaveBeenCalledWith('Error transforming workpad out: Transform failed');
  });
});
