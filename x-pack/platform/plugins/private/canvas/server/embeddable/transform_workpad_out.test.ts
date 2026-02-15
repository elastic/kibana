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
import { embeddableService } from '../kibana_services';

import { transformWorkpadOut } from './transform_workpad_out';

jest.mock('../kibana_services', () => ({
  embeddableService: {
    getTransforms: jest.fn().mockReturnValue({
      transformOut: jest.fn((config: any, references: SavedObjectReference[]) => {
        return { ...config, savedObjectId: references![0].id };
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

describe('transformWorkpadOut', () => {
  it('does not apply transforms to non-embeddable elements on the way out of storage', () => {
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
              expression: 'shape "square"',
              filter: '',
            },
          ],
        },
      ],
    };

    transformWorkpadOut(workpad, []);
    expect(embeddableService?.getTransforms).not.toHaveBeenCalled();
  });

  it('apply for transforms to embeddable config on the way out of storage', () => {
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
    title: 'Test lens embeddable',
  })}"`,
              filter: '',
            },
          ],
        },
      ],
    };

    const references = [
      {
        id: 'test-id',
        name: 'savedObjectRef',
        type: 'lens',
      },
    ] as SavedObjectReference[];

    const transformedWorkpad = transformWorkpadOut(workpad, references);
    expect(
      decode(
        fromExpression(transformedWorkpad.pages[0].elements[0].expression).chain[0].arguments
          .config[0] as string
      )
    ).toEqual({
      title: 'Test lens embeddable',
      savedObjectId: 'test-id',
    });

    expect(embeddableService?.getTransforms('lens')?.transformOut).toHaveBeenCalledWith(
      {
        title: 'Test lens embeddable',
      },
      [
        {
          id: 'test-id',
          name: 'savedObjectRef',
          type: 'lens',
        },
      ]
    );
  });
});
