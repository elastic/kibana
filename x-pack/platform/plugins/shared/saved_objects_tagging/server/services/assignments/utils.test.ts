/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { createSavedObject, createReference } from '../../../common/test_utils';
import { toAssignableObject } from './utils';

export const createType = (parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
  name: 'type',
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {},
  },
  ...parts,
});

describe('toAssignableObject', () => {
  it('gets the correct values from the object', () => {
    expect(
      toAssignableObject(
        createSavedObject({
          type: 'dashboard',
          id: 'foo',
        }),
        createType({})
      )
    ).toEqual(
      expect.objectContaining({
        type: 'dashboard',
        id: 'foo',
      })
    );
  });
  it('gets the correct values from the type', () => {
    expect(
      toAssignableObject(
        createSavedObject({}),
        createType({
          management: {
            getTitle: (obj) => 'some title',
            icon: 'myIcon',
          },
        })
      )
    ).toEqual(
      expect.objectContaining({
        title: 'some title',
        icon: 'myIcon',
      })
    );
  });
  it('extracts the tag ids from the object references', () => {
    expect(
      toAssignableObject(
        createSavedObject({
          references: [
            createReference('tag', 'tag-1'),
            createReference('dashboard', 'dash-1'),
            createReference('tag', 'tag-2'),
          ],
        }),
        createType({})
      )
    ).toEqual(
      expect.objectContaining({
        tags: ['tag-1', 'tag-2'],
      })
    );
  });
});
