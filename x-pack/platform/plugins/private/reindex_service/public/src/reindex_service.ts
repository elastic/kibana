/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { ReindexStatusResponse, UA_BASE_PATH } from '@kbn/upgrade-assistant-pkg-common';
import { sendRequest } from '@kbn/es-ui-shared-plugin/public';

export class ReindexService {
  private client: HttpSetup;

  constructor(client: HttpSetup) {
    this.client = client;
  }

  // todo look at x-pack/platform/plugins/private/upgrade_assistant/public/application/lib/api.ts:81
  public async getReindexStatus(indexName: string) {
    return sendRequest<ReindexStatusResponse>(this.client, {
      method: 'get',
      path: `${UA_BASE_PATH}/reindex/${indexName}`,
    });
  }

  // todo better types
  public async startReindex(indexName: string) {
    return sendRequest(this.client, {
      method: 'post',
      path: `${UA_BASE_PATH}/reindex/${indexName}`,
    });
  }

  // todo better types
  public async cancelReindex(indexName: string) {
    return sendRequest(this.client, {
      method: 'post',
      path: `${UA_BASE_PATH}/reindex/${indexName}/cancel`,
    });
  }
}

//
