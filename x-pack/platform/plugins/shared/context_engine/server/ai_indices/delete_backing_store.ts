/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { AiIndexDest } from '../../common/http_api/ai_indices';

/**
 * Deletes the backing data stream or index of an AI index, which also removes all of its
 * Knowledge Indicators (they are just documents stored in it).
 */
export const deleteAiIndexBackingStore = async (
  esClient: ElasticsearchClient,
  dest: AiIndexDest
): Promise<void> => {
  try {
    if (dest.type === 'data_stream') {
      await esClient.indices.deleteDataStream({ name: dest.value });
    } else {
      await esClient.indices.delete({ index: dest.value });
    }
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      return;
    }
    throw error;
  }
};
