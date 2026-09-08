/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddExamplesPayload } from '@kbn/evals-common';

export const IMPORT_CHUNK_SIZE = 10_000;

export const chunkExamples = (
  examples: AddExamplesPayload[],
  chunkSize = IMPORT_CHUNK_SIZE
): AddExamplesPayload[][] => {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0 || chunkSize > IMPORT_CHUNK_SIZE) {
    throw new Error(`Chunk size must be an integer between 1 and ${IMPORT_CHUNK_SIZE}.`);
  }

  const chunks: AddExamplesPayload[][] = [];
  for (let offset = 0; offset < examples.length; offset += chunkSize) {
    chunks.push(examples.slice(offset, offset + chunkSize));
  }
  return chunks;
};
