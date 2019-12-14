/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MAX_BYTES } from '../../common/constants/file_import';

// Add data elements to chunk until limit is met
export function sizeLimitedChunking(dataArr, maxChunkSize = MAX_BYTES) {
  let chunkSize = 0;
  return dataArr.reduce(
    (accu, el) => {
      const featureByteSize = new Blob([JSON.stringify(el)], { type: 'application/json' }).size;
      if (featureByteSize > maxChunkSize) {
        throw `Some features exceed maximum chunk size of ${maxChunkSize}`;
      } else if (chunkSize + featureByteSize < maxChunkSize) {
        const lastChunkRef = accu.length - 1;
        chunkSize += featureByteSize;
        accu[lastChunkRef].push(el);
      } else {
        chunkSize = featureByteSize;
        accu.push([el]);
      }
      return accu;
    },
    [[]]
  );
}
