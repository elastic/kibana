/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunkExamples, IMPORT_CHUNK_SIZE } from './chunk';

describe('chunkExamples', () => {
  it('splits examples at the import request boundary', () => {
    const examples = Array.from({ length: IMPORT_CHUNK_SIZE + 1 }, (_, index) => ({
      input: { index },
    }));
    const chunks = chunkExamples(examples);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(IMPORT_CHUNK_SIZE);
    expect(chunks[1]).toEqual([{ input: { index: IMPORT_CHUNK_SIZE } }]);
  });

  it('returns no chunks for no examples', () => {
    expect(chunkExamples([])).toEqual([]);
  });

  it('rejects chunk sizes above the route cap', () => {
    expect(() => chunkExamples([], IMPORT_CHUNK_SIZE + 1)).toThrow(
      `Chunk size must be an integer between 1 and ${IMPORT_CHUNK_SIZE}.`
    );
  });
});
