/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { createContentPack } from './create_content_pack';
import { createConcatStream, createPromiseFromStreams } from '@kbn/utils';
import { Readable } from 'stream';

describe('create_content_pack', () => {
  it('creates an empty content pack', async () => {
    const content = await createPromiseFromStreams([createContentPack(), createConcatStream('')]);

    assert.deepStrictEqual(content, '{"content_pack_version":"v1"}');
  });

  it('creates a valid content pack', async () => {
    const content = await createPromiseFromStreams([
      createContentPack(
        Readable.from([
          { type: 'saved_object', content: { id: 'foo' } },
          { type: 'saved_object', content: { id: 'bar' } },
        ]),
        Readable.from([{ type: 'processor', content: { field: 'message' } }]),
        Readable.from([{ type: 'mappings', content: { message: { type: 'keyword' } } }])
      ),
      createConcatStream(''),
    ]);

    const expected =
      '{"content_pack_version":"v1"}\n' +
      '{"type":"saved_object","content":{"id":"foo"}}\n' +
      '{"type":"saved_object","content":{"id":"bar"}}\n' +
      '{"type":"processor","content":{"field":"message"}}\n' +
      '{"type":"mappings","content":{"message":{"type":"keyword"}}}';
    assert.deepStrictEqual(content, expected);
  });
});
