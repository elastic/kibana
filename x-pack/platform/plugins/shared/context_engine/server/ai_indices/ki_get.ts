/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { GetKiResponse, KiDocument } from '../../common/http_api/knowledge_indicators';
import { KiNotFoundError } from './errors';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

export interface GetKiOptions {
  aiIndexId: string;
  destValue: string;
  index: string;
  kiId: string;
}

export const getKi = async (
  esClient: ElasticsearchClient,
  { aiIndexId, destValue, index, kiId }: GetKiOptions
): Promise<GetKiResponse> => {
  const response = await esClient.search<KiDocument>({
    index: destValue,
    ...LENIENT_INDEX_OPTIONS,
    query: {
      bool: {
        filter: [{ ids: { values: [kiId] } }, { term: { _index: index } }],
      },
    },
    size: 1,
  });

  const { _id: id, _source: document } = response.hits.hits[0] ?? {};
  if (id === undefined || document === undefined) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }

  return { id, document };
};
