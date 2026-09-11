/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_DATASET_EXAMPLES_REQUEST_BYTES,
  MAX_EXAMPLES_PER_DATASET,
  type AddEvaluationDatasetExamplesRequestBodyInput,
  type AddExamplesPayload,
} from '@kbn/evals-common';

export class ImportExampleTooLargeError extends Error {
  constructor() {
    super('An individual example exceeds the import request size limit.');
    this.name = 'ImportExampleTooLargeError';
  }
}

export const createImportRequestBody = (
  examples: AddExamplesPayload[]
): AddEvaluationDatasetExamplesRequestBodyInput => ({
  examples,
  source: 'import',
  on_duplicate: 'skip',
});

const textEncoder = new TextEncoder();
const getUtf8Size = (value: string): number => textEncoder.encode(value).byteLength;
const EMPTY_BODY_SIZE = getUtf8Size(JSON.stringify(createImportRequestBody([])));

export const chunkExamples = (
  examples: AddExamplesPayload[],
  maxBytes = MAX_DATASET_EXAMPLES_REQUEST_BYTES
): AddExamplesPayload[][] => {
  if (!Number.isInteger(maxBytes) || maxBytes <= EMPTY_BODY_SIZE) {
    throw new Error('The request size limit must fit a non-empty import body.');
  }

  const chunks: AddExamplesPayload[][] = [];
  let currentChunk: AddExamplesPayload[] = [];
  let currentBodySize = EMPTY_BODY_SIZE;

  for (const example of examples) {
    const exampleSize = getUtf8Size(JSON.stringify(example));
    if (EMPTY_BODY_SIZE + exampleSize > maxBytes) {
      throw new ImportExampleTooLargeError();
    }

    const separatorSize = currentChunk.length > 0 ? 1 : 0;
    if (
      currentChunk.length > 0 &&
      (currentChunk.length === MAX_EXAMPLES_PER_DATASET ||
        currentBodySize + separatorSize + exampleSize > maxBytes)
    ) {
      chunks.push(currentChunk);
      currentChunk = [example];
      currentBodySize = EMPTY_BODY_SIZE + exampleSize;
      continue;
    }

    currentChunk.push(example);
    currentBodySize += separatorSize + exampleSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};
