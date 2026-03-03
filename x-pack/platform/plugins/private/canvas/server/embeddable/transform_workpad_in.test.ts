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

jest.mock('../kibana_services', () => ({
  embeddableService: {
    getTransforms: jest.fn().mockReturnValue({
      transformIn: jest.fn((config: any) => {
        const { savedObjectId, ...remainingConfig } = config;
        return {
          state: { ...remainingConfig },
          references: [
            { id: savedObjectId, name: 'savedObjectRef', type: 'lens' },
          ] as SavedObjectReference[],
        };
      }),
    }),
  },
  logger: {
    error: jest.fn(),
  },
}));

describe('transformWorkpadIn', () => {
  it('transforms embeddable config on the way in', () => {
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

    expect(embeddableService?.getTransforms('lens')?.transformIn).toHaveBeenCalledWith({
      savedObjectId: 'test-id',
      title: 'Test lens embeddable',
    });
  });

  it('logs and re-throws errors when transformation fails', () => {
    const error = new Error('Transform failed');
    (embeddableService.getTransforms as jest.Mock).mockImplementationOnce(() => {
      throw error;
    });

    const workpad = makeWorkpad(`embeddable type="lens" config="${encode({ title: 'Test' })}"`);

    expect(() => transformWorkpadIn(workpad)).toThrow(error);
    expect(logger.error).toHaveBeenCalledWith('Error transforming workpad in: Transform failed');
  });
});
