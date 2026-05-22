/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Encode SO-style opaque version for tests (`[seqNo, primaryTerm]`). */
export const encodePrimaryStoreVersion = (seqNo: number, primaryTerm: number): string =>
  Buffer.from(JSON.stringify([seqNo, primaryTerm]), 'utf8').toString('base64');

export const occNumeric = (seqNo: number, primaryTerm: number = 1) => ({
  seqNo,
  primaryTerm,
});
