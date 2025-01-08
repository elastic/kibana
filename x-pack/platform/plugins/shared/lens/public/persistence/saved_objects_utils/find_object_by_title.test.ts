/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findObjectByTitle } from './find_object_by_title';
import { SavedObjectsClientContract, SimpleSavedObject } from '@kbn/core/public';
import { simpleSavedObjectMock } from '@kbn/core/public/mocks';
import { SavedObjectIndexStore } from '..';

describe('findObjectByTitle', () => {
  const indexStore: SavedObjectIndexStore = {} as SavedObjectIndexStore;
  const savedObjectsClient: SavedObjectsClientContract = {} as SavedObjectsClientContract;

  beforeEach(() => {
    indexStore.search = jest.fn();
  });

  it('returns undefined if title is not provided', async () => {
    const match = await findObjectByTitle(indexStore, 'index-pattern', '');
    expect(match).toBeUndefined();
  });

  it('matches any case', async () => {
    const indexPattern = simpleSavedObjectMock.create(savedObjectsClient, {
      attributes: { title: 'foo' },
    } as SimpleSavedObject);

    indexStore.search = jest.fn().mockImplementation(() =>
      Promise.resolve({
        hits: [indexPattern],
      })
    );
    const match = await findObjectByTitle(indexStore, 'index-pattern', 'FOO');
    expect(match).toEqual(indexPattern);
  });
});
