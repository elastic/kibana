/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

import { encode } from '../../common/lib/embeddable_dataurl';
import { DEFAULT_TIME_RANGE } from '../../common/lib';
import { embeddableService, logger } from '../kibana_services';

import { transformWorkpadOut } from './transform_workpad_out';
import { makeWorkpad, getDecodedConfig, getExpressionFunctionName } from './fixtures';

const mockLensTransforms = {
  transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
    return { ...config, savedObjectId: references[0].id };
  }),
};

const mockVisualizationTransforms = {
  transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
    return { ...config, savedObjectId: references[0].id };
  }),
};

const mockMapTransforms = {
  transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
    return { ...config, savedObjectId: references[0].id };
  }),
};

jest.mock('../kibana_services', () => ({
  embeddableService: {
    getTransforms: jest.fn((type: string) => {
      switch (type) {
        case 'lens-dashboard-app':
          return mockLensTransforms;
        case 'visualization':
          return mockVisualizationTransforms;
        case 'map':
          return mockMapTransforms;
      }
    }),
  },
  logger: {
    warn: jest.fn(),
  },
}));

describe('transformWorkpadOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not apply transforms to non-embeddable elements', () => {
    const expression = 'shape "square" | render';
    transformWorkpadOut(makeWorkpad(expression), []);
    expect(embeddableService?.getTransforms).not.toHaveBeenCalled();
  });

  describe('embeddable', () => {
    it('applies transformOut to embeddable config', () => {
      const expression = `embeddable type="lens" config="${encode({
        title: 'Test lens embeddable',
        savedObjectId: 'test-id',
      })}" | render`;
      const workpad = makeWorkpad(expression);

      const references = [
        { id: 'test-id', name: 'element-id:savedObjectRef', type: 'lens' },
        { id: 'test-id-3', name: 'other-element-id:savedObjectRef', type: 'lens' },
        { id: 'test-id-4', name: 'other-element-id:savedObjectRef', type: 'lens' },
        { id: 'test-id-5', name: 'other-element-id:savedObjectRef', type: 'lens' },
      ] as SavedObjectReference[];

      const transformedWorkpad = transformWorkpadOut(workpad, references);
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        title: 'Test lens embeddable',
        savedObjectId: 'test-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens-dashboard-app');
      expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
        { title: 'Test lens embeddable', savedObjectId: 'test-id' },
        [{ id: 'test-id', name: 'savedObjectRef', type: 'lens' }]
      );
    });

    it('applies transformOut to embeddable config with an explicit saved object id without references', () => {
      const expression = `embeddable type="visualization" config="${encode({
        savedObjectId: 'embeddable-id',
        timeRange: DEFAULT_TIME_RANGE,
      })}" | render`;
      const workpad = makeWorkpad(expression);
      const references = [] as SavedObjectReference[];
      const transformedWorkpad = transformWorkpadOut(workpad, references);
      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'embeddable-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'embeddable-id' },
        [
          {
            id: 'embeddable-id',
            name: 'savedObjectRef',
            type: 'visualization',
          },
        ]
      );
    });

    it('overrides the legacy reference names with savedObjectRef', () => {
      const expression = `embeddable type="map" config="${encode({
        title: 'Test map embeddable',
        savedObjectId: 'embeddable.id',
      })}" | render`;
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'test-id', name: 'element-id:embeddable.id', type: 'map' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        title: 'Test map embeddable',
        savedObjectId: 'test-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        { title: 'Test map embeddable', savedObjectId: 'embeddable.id' },
        [{ id: 'test-id', name: 'savedObjectRef', type: 'map' }]
      );
    });
  });
});

describe('legacy expressions', () => {
  describe('savedLens', () => {
    it('migrates savedLens to an embeddable expression with transforms applied', () => {
      const expression = 'savedLens id="savedLens.id" | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'lens-id', name: 'element-id:l0_savedLens.id', type: 'lens' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'lens-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens-dashboard-app');
      expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'savedLens.id' },
        [{ id: 'lens-id', name: 'savedObjectRef', type: 'lens' }]
      );
    });

    it('migrates savedLens with an explicit title', () => {
      const expression = 'savedLens id="savedLens.id" title="My Lens" | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'lens-id', name: 'element-id:l1_savedLens.id', type: 'lens' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        title: 'My Lens',
        savedObjectId: 'lens-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens-dashboard-app');
      expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, title: 'My Lens', savedObjectId: 'savedLens.id' },
        [{ id: 'lens-id', name: 'savedObjectRef', type: 'lens' }]
      );
    });

    it('migrates savedLens with an explicit timerange', () => {
      const expression =
        'savedLens id="savedLens.id" timerange={timerange from="now-7d" to="now"} | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'lens-id', name: 'element-id:l2_savedLens.id', type: 'lens' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: { from: 'now-7d', to: 'now' },
        savedObjectId: 'lens-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens-dashboard-app');
      expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: { from: 'now-7d', to: 'now' }, savedObjectId: 'savedLens.id' },
        [{ id: 'lens-id', name: 'savedObjectRef', type: 'lens' }]
      );
    });

    it('migrates savedLens with an explicit saved object id without references', () => {
      const expression = 'savedLens id="lens-id" | render';
      const workpad = makeWorkpad(expression);
      const references = [] as SavedObjectReference[];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'lens-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens-dashboard-app');
      expect(mockLensTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'lens-id' },
        [
          {
            id: 'lens-id',
            name: 'savedObjectRef',
            type: 'lens',
          },
        ]
      );
    });
  });

  describe('savedVisualization', () => {
    it('migrates savedVisualization to an embeddable expression with transforms applied', () => {
      const expression = 'savedVisualization id="savedVisualization.id" | render';
      const workpad = makeWorkpad(expression);
      const references = [
        { id: 'vis-id', name: 'element-id:l0_savedVisualization.id', type: 'visualization' },
      ];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'vis-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'savedVisualization.id' },
        [{ id: 'vis-id', name: 'savedObjectRef', type: 'visualization' }]
      );
    });

    it('migrates savedVisualization with an explicit title', () => {
      const expression = 'savedVisualization id="savedVisualization.id" title="My Viz" | render';
      const workpad = makeWorkpad(expression);
      const references = [
        { id: 'vis-id', name: 'element-id:l1_savedVisualization.id', type: 'visualization' },
      ];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        title: 'My Viz',
        savedObjectId: 'vis-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, title: 'My Viz', savedObjectId: 'savedVisualization.id' },
        [{ id: 'vis-id', name: 'savedObjectRef', type: 'visualization' }]
      );
    });

    it('migrates savedVisualization with an explicit timerange', () => {
      const expression =
        'savedVisualization id="savedVisualization.id" timerange={timerange from="now-7d" to="now"} | render';
      const workpad = makeWorkpad(expression);
      const references = [
        { id: 'vis-id', name: 'element-id:l2_savedVisualization.id', type: 'visualization' },
      ];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual(
        expect.objectContaining({ timeRange: { from: 'now-7d', to: 'now' } })
      );
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: { from: 'now-7d', to: 'now' }, savedObjectId: 'savedVisualization.id' },
        [{ id: 'vis-id', name: 'savedObjectRef', type: 'visualization' }]
      );
    });

    it('migrates savedVisualization with hideLegend=true', () => {
      const expression = 'savedVisualization id="savedVisualization.id" hideLegend=true | render';
      const workpad = makeWorkpad(expression);
      const references = [
        { id: 'vis-id', name: 'element-id:l3_savedVisualization.id', type: 'visualization' },
      ];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'vis-id',
        vis: {
          legendOpen: false,
        },
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        {
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'savedVisualization.id',
          vis: { legendOpen: false },
        },
        [{ id: 'vis-id', name: 'savedObjectRef', type: 'visualization' }]
      );
    });

    it('migrates savedVisualization with an hideLegend=false', () => {
      const expression = 'savedVisualization id="savedVisualization.id" hideLegend=false | render';
      const workpad = makeWorkpad(expression);
      const references = [
        { id: 'vis-id', name: 'element-id:l4_savedVisualization.id', type: 'visualization' },
      ];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'vis-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'savedVisualization.id' },
        [{ id: 'vis-id', name: 'savedObjectRef', type: 'visualization' }]
      );
    });

    it('migrates savedVisualization with an explicit saved object id without references', () => {
      const expression = 'savedVisualization id="vis-id" | render';
      const workpad = makeWorkpad(expression);
      const references = [] as SavedObjectReference[];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'vis-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
      expect(mockVisualizationTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'vis-id' },
        [
          {
            id: 'vis-id',
            name: 'savedObjectRef',
            type: 'visualization',
          },
        ]
      );
    });
  });

  describe('savedMap', () => {
    it('migrates savedMap to an embeddable expression with transforms applied', () => {
      const expression = 'savedMap id="savedMap.id" | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'map-id', name: 'element-id:l0_savedMap.id', type: 'map' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'map-id',
        hiddenLayers: [],
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        {
          timeRange: DEFAULT_TIME_RANGE,
          hiddenLayers: [],
          savedObjectId: 'savedMap.id',
        },
        [{ id: 'map-id', name: 'savedObjectRef', type: 'map' }]
      );
    });

    it('migrates savedMap with an explicit title', () => {
      const expression = 'savedMap id="savedMap.id" title="My Map" | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'map-id', name: 'element-id:l1_savedMap.id', type: 'map' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'map-id',
        hiddenLayers: [],
        title: 'My Map',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'savedMap.id', hiddenLayers: [] },
        [{ id: 'map-id', name: 'savedObjectRef', type: 'map' }]
      );
    });

    it('migrates savedMap with an explicit timerange', () => {
      const expression =
        'savedMap id="savedMap.id" timerange={timerange from="now-7d" to="now"} | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'map-id', name: 'element-id:l2_savedMap.id', type: 'map' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);
      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: { from: 'now-7d', to: 'now' },
        savedObjectId: 'map-id',
        hiddenLayers: [],
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        {
          timeRange: { from: 'now-7d', to: 'now' },
          savedObjectId: 'savedMap.id',
          hiddenLayers: [],
        },
        [{ id: 'map-id', name: 'savedObjectRef', type: 'map' }]
      );
    });

    it('migrates savedMap with an explicit hideLayer', () => {
      const expression =
        'savedMap id="savedMap.id" hideLayer="layer-id-1" hideLayer="layer-id-2" | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'map-id', name: 'element-id:l3_savedMap.id', type: 'map' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'map-id',
        hiddenLayers: ['layer-id-1', 'layer-id-2'],
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        {
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'savedMap.id',
          hiddenLayers: ['layer-id-1', 'layer-id-2'],
        },
        [{ id: 'map-id', name: 'savedObjectRef', type: 'map' }]
      );
    });

    it('migrates savedMap with an explicit center', () => {
      const expression =
        'savedMap id="savedMap.id" center={mapCenter lat=37.7749 lon=-122.4194 zoom=12} | render';
      const workpad = makeWorkpad(expression);
      const references = [{ id: 'map-id', name: 'element-id:l4_savedMap.id', type: 'map' }];
      const transformedWorkpad = transformWorkpadOut(workpad, references);
      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'map-id',
        hiddenLayers: [],
        mapCenter: {
          lat: 37.7749,
          lon: -122.4194,
          zoom: 12,
        },
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        {
          timeRange: DEFAULT_TIME_RANGE,
          savedObjectId: 'savedMap.id',
          mapCenter: { lat: 37.7749, lon: -122.4194, zoom: 12 },
          hiddenLayers: [],
        },
        [{ id: 'map-id', name: 'savedObjectRef', type: 'map' }]
      );
    });

    it('migrates savedMap with an explicit saved object id without references', () => {
      const expression = 'savedMap id="map-id" | render';
      const workpad = makeWorkpad(expression);
      const references = [] as SavedObjectReference[];
      const transformedWorkpad = transformWorkpadOut(workpad, references);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        savedObjectId: 'map-id',
        hiddenLayers: [],
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('map');
      expect(mockMapTransforms.transformOut).toHaveBeenCalledWith(
        { timeRange: DEFAULT_TIME_RANGE, savedObjectId: 'map-id', hiddenLayers: [] },
        [
          {
            id: 'map-id',
            name: 'savedObjectRef',
            type: 'map',
          },
        ]
      );
    });
  });

  it('logs warnings when transformation fails and returns the original embeddable config', () => {
    (mockLensTransforms.transformOut as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Transform failed');
    });

    const expression = `embeddable type="lens" config="${encode({
      title: 'Test',
      savedObjectId: 'embeddable-id',
    })}" | render`;
    const workpad = makeWorkpad(expression);
    const references = [] as SavedObjectReference[];
    const transformedWorkpad = transformWorkpadOut(workpad, references);

    expect(getDecodedConfig(transformedWorkpad)).toEqual({
      title: 'Test',
      savedObjectId: 'embeddable-id',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Error transforming element [element-id] out: Transform failed'
    );
  });
});
