/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DATASET_EXAMPLES_REQUEST_BYTES, MAX_EXAMPLES_PER_DATASET } from '@kbn/evals-common';
import { chunkExamples, createImportRequestBody, ImportExampleTooLargeError } from './chunk';

const getBodySize = (examples: Parameters<typeof createImportRequestBody>[0]) =>
  new TextEncoder().encode(JSON.stringify(createImportRequestBody(examples))).byteLength;

describe('chunkExamples', () => {
  it('splits examples at the route item limit', () => {
    const examples = Array.from({ length: MAX_EXAMPLES_PER_DATASET + 1 }, (_, index) => ({
      input: { index },
    }));
    const chunks = chunkExamples(examples);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(MAX_EXAMPLES_PER_DATASET);
    expect(chunks[1]).toEqual([{ input: { index: MAX_EXAMPLES_PER_DATASET } }]);
  });

  it('splits examples by the serialized UTF-8 request size', () => {
    const examples = [{ input: { value: 'é'.repeat(10) } }, { input: { value: 'é'.repeat(10) } }];
    const maxBytes = getBodySize(examples) - 1;
    const chunks = chunkExamples(examples, maxBytes);

    expect(chunks).toEqual([[examples[0]], [examples[1]]]);
    expect(chunks.every((chunk) => getBodySize(chunk) <= maxBytes)).toBe(true);
  });

  it('keeps every default import request within the shared route body cap', () => {
    const examples = [
      { input: { value: 'x'.repeat(3 * 1024 * 1024) } },
      { input: { value: 'y'.repeat(3 * 1024 * 1024) } },
    ];
    const chunks = chunkExamples(examples);

    expect(chunks).toHaveLength(2);
    expect(chunks.every((chunk) => getBodySize(chunk) <= MAX_DATASET_EXAMPLES_REQUEST_BYTES)).toBe(
      true
    );
  });

  it('returns no chunks for no examples', () => {
    expect(chunkExamples([])).toEqual([]);
  });

  it('rejects an individual example that exceeds the request size limit', () => {
    const example = { input: { value: 'x'.repeat(100) } };

    expect(() => chunkExamples([example], getBodySize([]) + 10)).toThrow(
      ImportExampleTooLargeError
    );
  });
});
