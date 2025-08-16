/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { badRequest } from '@hapi/boom';
import { UpdateFailureStoreResponse } from '../../../../common/api_types';

export async function updateFailureStore({
  esClient,
  dataStream,
  failureStoreEnabled,
  customRetentionPeriod,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  failureStoreEnabled: boolean;
  customRetentionPeriod?: string;
  isServerless: boolean;
}): Promise<UpdateFailureStoreResponse> {
  try {
    return await esClient.transport.request(
      {
        method: 'PUT',
        path: `/_data_stream/${dataStream}/_options`,
        body: {
          failure_store: {
            enabled: failureStoreEnabled,
            lifecycle: {
              data_retention: customRetentionPeriod || null,
              ...(isServerless ? {} : { enabled: !!customRetentionPeriod }),
            },
          },
        },
      },
      { meta: true }
    );
  } catch (error) {
    throw badRequest(`Failed to update failure store for data stream "${dataStream}": ${error}`);
  }
}
