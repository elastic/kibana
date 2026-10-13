/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlRow } from '../row_coercion';

/** Drains an `EsqlRowBatchSource`'s batches into an array, for asserting on the whole stream. */
export const collectBatches = async (batches: AsyncIterable<EsqlRow[]>): Promise<EsqlRow[][]> => {
  const collected: EsqlRow[][] = [];
  for await (const batch of batches) {
    collected.push(batch);
  }
  return collected;
};
