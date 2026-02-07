/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { fromExpression } from '@kbn/interpreter';

import type { WorkpadAttributes } from '../routes/workpad/workpad_attributes';
import { decode, encode } from '../../common/lib/embeddable_dataurl';

import { transformWorkpadIn } from './transform_workpad_in';
import { embeddableService } from '../kibana_services';

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
}));

const baseWorkpadAttributes: WorkpadAttributes = {
  assets: {},
  '@timestamp': new Date().toISOString(),
  '@created': new Date().toISOString(),
  height: 100,
  width: 100,
  css: '',
  name: 'Test workpad',
  page: 0,
  pages: [],
  colors: [],
  variables: [],
  isWriteable: true,
};

describe('transformWorkpadIn', () => {
  it('transforms embeddable config on the way in', () => {
    const workpad: WorkpadAttributes = {
      ...baseWorkpadAttributes,
      pages: [
        {
          id: 'page-id',
          style: { background: 'white' },
          transition: 'none',
          groups: [],
          elements: [
            {
              id: 'element-id',
              position: { left: 0, top: 0, width: 100, height: 100, angle: 0, parent: null },
              type: 'element',
              expression: `embeddable type="lens" 
  config="${encode({
    savedObjectId: 'test-id',
    title: 'Test lens embeddable',
  })}"`,
              filter: '',
            },
          ],
        },
      ],
    };

    const { attributes, references } = transformWorkpadIn(workpad);
    expect(
      decode(
        fromExpression(attributes.pages[0].elements[0].expression).chain[0].arguments
          .config[0] as string
      )
    ).toEqual({
      title: 'Test lens embeddable',
    });
    expect(references).toEqual([
      {
        id: 'test-id',
        name: 'savedObjectRef',
        type: 'lens',
      },
    ]);

    expect(embeddableService?.getTransforms('lens')?.transformIn).toHaveBeenCalledWith({
      savedObjectId: 'test-id',
      title: 'Test lens embeddable',
    });
  });
});
