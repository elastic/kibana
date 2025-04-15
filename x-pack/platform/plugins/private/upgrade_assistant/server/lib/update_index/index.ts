/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UpdateIndexOperation } from '../../../common/update_index';

export interface UpdateIndexParams {
  esClient: ElasticsearchClient;
  index: string;
  operations: UpdateIndexOperation[];
}

/**
 * Perform some updates on a given index, to address compatibility issues.
 * @param esClient Elasticsearch client, to issue http calls to ES
 * @param index The index to update
 * @param operations The operations to perform on the specified index
 */
export async function updateIndex({ esClient, index, operations }: UpdateIndexParams) {
  for (const operation of operations) {
    let res;

    switch (operation) {
      case 'blockWrite': {
        res = await esClient.indices.addBlock({ index, block: 'write' });
        break;
      }
      case 'unfreeze': {
        throw new Error('Unfreeze is not supported after 8.x');
      }
    }
    if (!res.acknowledged) {
      throw new Error(`Could not set apply ${operation} to ${index}.`);
    }
  }
}
