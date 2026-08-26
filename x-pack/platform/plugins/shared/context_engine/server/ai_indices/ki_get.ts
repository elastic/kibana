/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { GetKiResponse, KiDocument } from '../../common/http_api/knowledge_indicators';
import { KiNotFoundError } from './errors';

export interface GetKiOptions {
  aiIndexId: string;
  index: string;
  kiId: string;
}

export const getKi = async (
  esClient: ElasticsearchClient,
  { aiIndexId, index, kiId }: GetKiOptions
): Promise<GetKiResponse> => {
  try {
    const response = await esClient.get<KiDocument>({
      index,
      id: kiId,
    });

    const { _id: id, _source: document } = response;
    if (document === undefined) {
      throw new KiNotFoundError(aiIndexId, kiId);
    }

    return { id, document };
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 404) {
      throw new KiNotFoundError(aiIndexId, kiId);
    }
    throw error;
  }
};
