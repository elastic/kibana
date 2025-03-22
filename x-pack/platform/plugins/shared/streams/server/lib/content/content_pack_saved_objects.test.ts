/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { Readable } from 'stream';
import {
  createConcatStream,
  createIntersperseStream,
  createListStream,
  createMapStream,
  createPromiseFromStreams,
} from '@kbn/utils';
import { contentPackSavedObjects } from './content_pack_saved_objects';

const createContentPack = (objects: any[]): Readable => {
  return createListStream(objects)
    .pipe(createMapStream((object) => JSON.stringify(object)))
    .pipe(createIntersperseStream('\n'));
};

describe('content_pack_saved_objects', () => {
  it('creates a saved objects stream', async () => {
    const content = createContentPack([
      { content_pack_version: 'v1' },
      { type: 'not_a_saved_object' },
      { type: 'saved_object', content: { id: 'foo', type: 'dashboard' } },
      { type: 'not_a_saved_object' },
      { type: 'saved_object', content: { id: 'bar', type: 'dashboard' } },
    ]);
    const savedObjects = await createPromiseFromStreams([
      contentPackSavedObjects(content),
      createConcatStream([]),
    ]);

    assert.deepStrictEqual(savedObjects, [
      { id: 'foo', type: 'dashboard' },
      { id: 'bar', type: 'dashboard' },
    ]);
  });

  it('return no data when no saved objects', async () => {
    const contentPack = createContentPack([
      { content_pack_version: 'v1' },
      { type: 'not_a_saved_object' },
    ]);
    const savedObjects = await createPromiseFromStreams([
      contentPackSavedObjects(contentPack),
      createConcatStream([]),
    ]);

    assert.deepStrictEqual(savedObjects, []);
  });
});
