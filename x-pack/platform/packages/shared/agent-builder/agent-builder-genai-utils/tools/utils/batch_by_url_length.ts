/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_MAX_JOINED_LENGTH = 3000;

/**
 * Splits an array of resource names into batches where each batch's
 * comma-joined string stays under {@link maxJoinedLength} characters.
 *
 * This is used to prevent `too_long_http_line_exception` errors from
 * Elasticsearch when many resource names are serialized into URL paths.
 */
export const batchByUrlLength = (
  names: string[],
  maxJoinedLength: number = DEFAULT_MAX_JOINED_LENGTH
): string[][] => {
  if (names.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentLength = 0;

  for (const name of names) {
    const addedLength = currentBatch.length === 0 ? name.length : name.length + 1; // +1 for comma

    if (currentBatch.length > 0 && currentLength + addedLength > maxJoinedLength) {
      batches.push(currentBatch);
      currentBatch = [name];
      currentLength = name.length;
    } else {
      currentBatch.push(name);
      currentLength += addedLength;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};
