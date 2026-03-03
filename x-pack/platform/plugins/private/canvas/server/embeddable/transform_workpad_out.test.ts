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

jest.mock('../kibana_services', () => ({
  embeddableService: {
    getTransforms: jest.fn().mockReturnValue({
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
    }),
  },
  logger: {
    error: jest.fn(),
  },
}));

describe('transformWorkpadOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not apply transforms to non-embeddable elements on the way out of storage', () => {
    transformWorkpadOut(makeWorkpad('shape "square"'), []);
    expect(embeddableService?.getTransforms).not.toHaveBeenCalled();
  });

  it('applies transforms to embeddable config on the way out of storage', () => {
    const workpad = makeWorkpad(
      `embeddable type="lens" config="${encode({ title: 'Test lens embeddable' })}"`
    );

    const references = [
      { id: 'test-id', name: 'element-id:savedObjectRef', type: 'lens' },
    ] as SavedObjectReference[];

    const transformedWorkpad = transformWorkpadOut(workpad, references);
    expect(getDecodedConfig(transformedWorkpad)).toEqual({
      title: 'Test lens embeddable',
      savedObjectId: 'test-id',
    });

    expect(embeddableService?.getTransforms('lens')?.transformOut).toHaveBeenCalledWith(
      { title: 'Test lens embeddable' },
      [{ id: 'test-id', name: 'savedObjectRef', type: 'lens' }]
    );
  });

  describe('legacy expression migration', () => {
    it('migrates savedLens to an embeddable expression with transforms applied', () => {
      const workpad = makeWorkpad('savedLens id="lens-id" title="My Lens"');

      const transformedWorkpad = transformWorkpadOut(workpad, [
        { id: 'lens-id', name: 'savedObjectRef', type: 'lens' },
      ]);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        title: 'My Lens',
        savedObjectId: 'lens-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('lens');
      expect(embeddableService.getTransforms('lens')?.transformIn).toHaveBeenCalledWith({
        savedObjectId: 'lens-id',
        timeRange: DEFAULT_TIME_RANGE,
        title: 'My Lens',
      });
    });

    it('migrates savedLens with an explicit timerange', () => {
      const workpad = makeWorkpad(
        'savedLens id="lens-id" timerange={timerange from="now-7d" to="now"}'
      );

      const transformedWorkpad = transformWorkpadOut(workpad, [
        { id: 'vis-id', name: 'savedObjectRef', type: 'visualization' },
      ]);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual(
        expect.objectContaining({ timeRange: { from: 'now-7d', to: 'now' } })
      );
    });

    it('migrates savedVisualization to an embeddable expression with transforms applied', () => {
      const workpad = makeWorkpad('savedVisualization id="vis-id" title="My Viz"');

      const transformedWorkpad = transformWorkpadOut(workpad, [
        { id: 'vis-id', name: 'savedObjectRef', type: 'visualization' },
      ]);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        title: 'My Viz',
        savedObjectId: 'vis-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('visualization');
    });

    it('migrates savedMap to an embeddable expression with transforms applied', () => {
      const workpad = makeWorkpad('savedMap id="map-id" title="My Map"');

      const transformedWorkpad = transformWorkpadOut(workpad, [
        { id: 'map-id', name: 'savedObjectRef', type: 'map' },
      ]);

      expect(getExpressionFunctionName(transformedWorkpad)).toBe('embeddable');
      expect(getDecodedConfig(transformedWorkpad)).toEqual({
        timeRange: DEFAULT_TIME_RANGE,
        title: 'My Map',
        savedObjectId: 'map-id',
      });
      expect(embeddableService.getTransforms).toHaveBeenCalledWith('maps');
    });
  });

  it('logs and re-throws errors when transformation fails', () => {
    const error = new Error('Transform failed');
    (embeddableService.getTransforms as jest.Mock).mockImplementationOnce(() => {
      throw error;
    });

    const workpad = makeWorkpad(`embeddable type="lens" config="${encode({ title: 'Test' })}"`);

    expect(() => transformWorkpadOut(workpad, [])).toThrow(error);
    expect(logger.error).toHaveBeenCalledWith('Error transforming workpad out: Transform failed');
  });
});
