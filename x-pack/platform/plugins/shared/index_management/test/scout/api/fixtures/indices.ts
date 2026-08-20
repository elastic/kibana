/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

// `indices.delete` rejects wildcards and empty lists, the default expand_wildcards hides closed
// indices, and `ignore_unavailable` keeps a missing literal name from returning an error body.
export const deleteIndices = async (esClient: EsClient, pattern: string) => {
  const indices = Object.keys(
    await esClient.indices.get({
      index: pattern,
      expand_wildcards: 'all',
      ignore_unavailable: true,
    })
  );
  if (indices.length) {
    await esClient.indices.delete({ index: indices });
  }
};
