/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The ES client joins name arrays with commas then calls encodeURIComponent, so each comma
// becomes %2C (3 bytes). Elasticsearch's Netty HTTP server rejects request lines > 4096 bytes,
// so we cap each batch well below that limit.
const MAX_URL_NAMES_BYTES = 3_500;

export const chunkByUrlLength = (names: string[]): string[][] => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;

  for (const name of names) {
    const cost = name.length + (current.length > 0 ? 3 : 0); // 3 bytes for %2C separator
    if (current.length > 0 && currentBytes + cost > MAX_URL_NAMES_BYTES) {
      chunks.push(current);
      current = [name];
      currentBytes = name.length;
    } else {
      current.push(name);
      currentBytes += cost;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};
