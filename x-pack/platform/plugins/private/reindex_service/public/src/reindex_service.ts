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

// same as -
// import { UA_BASE_PATH } from '@kbn/upgrade-assistant-pkg-common';
// bundle size is smaller if its duplicated
const UA_BASE_PATH = '/api/upgrade_assistant';

export class ReindexService {
  private client: HttpSetup;

  constructor(client: HttpSetup) {
    this.client = client;
  }

  public async getReindexStatus(indexName: string) {
    return sendRequest<ReindexStatusResponse>(this.client, {
      method: 'get',
      path: `${UA_BASE_PATH}/reindex/${indexName}`,
    });
  }

  public async startReindex(reindexArgs: Omit<ReindexArgs, 'reindexOptions'>) {
    return sendRequest<ReindexOperation>(this.client, {
      method: 'post',
      path: `${UA_BASE_PATH}/reindex`,
      body: reindexArgs,
    });
  }

  public async cancelReindex(indexName: string) {
    return sendRequest<ReindexOperationCancelResponse>(this.client, {
      method: 'post',
      path: `${UA_BASE_PATH}/reindex/${indexName}/cancel`,
    });
  }
}

//
