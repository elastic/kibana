/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { sendRequest } from '@kbn/es-ui-shared-plugin/public';
import type {
  ReindexArgs,
  ReindexStatusResponse,
  ReindexOperation,
  ReindexOperationCancelResponse,
} from '../../common';
import { REINDEX_SERVICE_BASE_PATH } from '../../common';

export class ReindexService {
  private client: HttpSetup;

  constructor(client: HttpSetup) {
    this.client = client;
  }

  public async getReindexStatus(indexName: string) {
    return sendRequest<ReindexStatusResponse>(this.client, {
      method: 'get',
      path: `${REINDEX_SERVICE_BASE_PATH}/${indexName}`,
    });
  }

  public async startReindex(reindexArgs: ReindexArgs) {
    return sendRequest<ReindexOperation>(this.client, {
      method: 'post',
      path: REINDEX_SERVICE_BASE_PATH,
      body: reindexArgs,
    });
  }

  public async cancelReindex(indexName: string) {
    return sendRequest<ReindexOperationCancelResponse>(this.client, {
      method: 'post',
      path: `${REINDEX_SERVICE_BASE_PATH}/${indexName}/cancel`,
    });
  }
}

//
