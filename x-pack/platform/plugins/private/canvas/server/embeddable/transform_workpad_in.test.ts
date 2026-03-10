/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';

import { encode } from '../../common/lib/embeddable_dataurl';
import { transformWorkpadIn } from './transform_workpad_in';
import { embeddableService, logger } from '../kibana_services';
import { getDecodedConfig, makeWorkpad } from './fixtures';

const mockLensTransformIn = jest.fn((config: any) => {
  const { savedObjectId, ...remainingConfig } = config;
  return {
    state: remainingConfig,
    references: [
      { id: savedObjectId, name: 'savedObjectRef', type: 'lens' },
    ] as SavedObjectReference[],
  };
});

const mockVisualizationTransformIn = jest.fn((config: any) => {
  const { savedObjectId, ...remainingConfig } = config;
  return {
    state: remainingConfig,
    references: [
      { id: savedObjectId, name: 'savedObjectRef', type: 'visualization' },
    ] as SavedObjectReference[],
  };
});

const mockMapTransformIn = jest.fn((config: any) => {
  const { savedObjectId, ...remainingConfig } = config;
  return {
    state: remainingConfig,
    references: [
      { id: savedObjectId, name: 'savedObjectRef', type: 'map' },
    ] as SavedObjectReference[],
  };
});
jest.mock('../kibana_services', () => ({
  embeddableService: {
    getTransforms: jest.fn((type: string) => {
      switch (type) {
        case 'lens-dashboard-app':
          return { transformIn: mockLensTransformIn };
        case 'visualization':
          return { transformIn: mockVisualizationTransformIn };
        case 'map':
          return { transformIn: mockMapTransformIn };
        default:
          return;
      }
    }),
  },
  logger: {
    warn: jest.fn(),
  },
}));

describe('transformWorkpadIn', () => {
  it('transforms embeddable with lens config from stored state to REST API state', () => {
    const workpad = makeWorkpad(
      `embeddable type="lens" config="${encode({
        title: 'Test lens embeddable',
        savedObjectId: 'test-id',
      })}"`
    );

    const { attributes, references } = transformWorkpadIn(workpad);
    expect(getDecodedConfig(attributes)).toEqual({
      title: 'Test lens embeddable',
    });
    expect(references).toEqual([
      {
        id: 'test-id',
        name: 'element-id:savedObjectRef',
        type: 'lens',
      },
    ]);

    expect(embeddableService?.getTransforms).toHaveBeenCalledWith('lens-dashboard-app');
    expect(mockLensTransformIn).toHaveBeenCalledWith({
      savedObjectId: 'test-id',
      title: 'Test lens embeddable',
    });
  });

  it('transforms embeddable with visualization config from stored state to REST API state', () => {
    const workpad = makeWorkpad(
      `embeddable type="visualization" config="${encode({
        title: 'Test visualization embeddable',
        savedObjectId: 'test-id',
      })}"`
    );

    const { attributes, references } = transformWorkpadIn(workpad);
    expect(getDecodedConfig(attributes)).toEqual({
      title: 'Test visualization embeddable',
    });
    expect(references).toEqual([
      {
        id: 'test-id',
        name: 'element-id:savedObjectRef',
        type: 'visualization',
      },
    ]);

    expect(embeddableService?.getTransforms).toHaveBeenCalledWith('visualization');
    expect(mockVisualizationTransformIn).toHaveBeenCalledWith({
      savedObjectId: 'test-id',
      title: 'Test visualization embeddable',
    });
  });

  it('transforms embeddable with map config from stored state to REST API state', () => {
    const workpad = makeWorkpad(
      `embeddable type="map" config="${encode({
        title: 'Test map embeddable',
        savedObjectId: 'test-id',
      })}"`
    );

    const { attributes, references } = transformWorkpadIn(workpad);
    expect(getDecodedConfig(attributes)).toEqual({
      title: 'Test map embeddable',
    });
    expect(references).toEqual([
      {
        id: 'test-id',
        name: 'element-id:savedObjectRef',
        type: 'map',
      },
    ]);

    expect(embeddableService?.getTransforms).toHaveBeenCalledWith('map');
    expect(mockMapTransformIn).toHaveBeenCalledWith({
      savedObjectId: 'test-id',
      title: 'Test map embeddable',
    });
  });

  it('logs warnings when transformation fails and returns the original embeddable config and no references', () => {
    (embeddableService.getTransforms as jest.Mock).mockReturnValue({
      transformIn: jest.fn(() => {
        throw new Error('Transform failed');
      }),
    });

    const workpad = makeWorkpad(
      `embeddable type="lens" config="${encode({ title: 'Test', savedObjectId: 'test-id' })}"`
    );
    const { attributes, references } = transformWorkpadIn(workpad);
    expect(getDecodedConfig(attributes)).toEqual({
      title: 'Test',
      savedObjectId: 'test-id',
    });
    expect(references).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Error transforming workpad in: Transform failed');
  });
});
