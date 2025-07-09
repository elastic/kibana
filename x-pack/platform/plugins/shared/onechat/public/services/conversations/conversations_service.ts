/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { toSerializedAgentIdentifier } from '@kbn/onechat-common';
import type { ListConversationsResponse } from '../../../common/http_api/conversations';
import type { ConversationListOptions } from '../../../common/conversations';

export class ConversationsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list({ agentId }: ConversationListOptions) {
    return await this.http.post<ListConversationsResponse>('/internal/onechat/conversations', {
      body: JSON.stringify({ agentId: agentId ? toSerializedAgentIdentifier(agentId) : undefined }),
    });
  }
}
