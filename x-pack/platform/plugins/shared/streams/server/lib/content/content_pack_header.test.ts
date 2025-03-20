/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { Readable } from 'stream';
import { ContentPackHeader } from '@kbn/streams-schema';
import { createIntersperseStream, createListStream, createMapStream } from '@kbn/utils';
import { contentPackHeader } from './content_pack_header';

const createContentPack = (objects: any[]): Readable => {
  return createListStream(objects)
    .pipe(createMapStream((object) => JSON.stringify(object)))
    .pipe(createIntersperseStream('\n'));
};

describe('content_pack_header', () => {
  it('parses valid content pack header', async () => {
    const content = createContentPack([
      { content_pack_version: 'v1' } as ContentPackHeader,
      { type: 'saved_object' },
    ]);
    const header = await contentPackHeader(content);

    assert.deepStrictEqual(header, { content_pack_version: 'v1' });
  });

  it('rejects invalid header', async () => {
    const content = createContentPack([{ not_a_valid_header: 'v1' }]);
    await assert.rejects(contentPackHeader(content));
  });

  it('rejects header not correctly positioned', async () => {
    const content = createContentPack([
      { type: 'saved_object' },
      { type: 'saved_object' },
      { content_pack_version: 'v1' } as ContentPackHeader,
    ]);
    await assert.rejects(contentPackHeader(content));
  });

  it('rejects empty files', async () => {
    await assert.rejects(contentPackHeader(Readable.from([])));
  });
});
