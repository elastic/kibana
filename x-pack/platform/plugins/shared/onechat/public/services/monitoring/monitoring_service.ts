/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  MonitoringListConversationsResponse,
  MonitoringConversationResponse,
} from '../../../common/http_api/conversations';
import { internalApiPath } from '../../../common/constants';

export interface MonitoringListConversationsOptions {
  startDate?: string;
  endDate?: string;
  userName?: string;
}

export class MonitoringService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async listConversations(
    options?: MonitoringListConversationsOptions
  ): Promise<MonitoringListConversationsResponse> {
    const query: Record<string, string> = {};

    if (options?.startDate) {
      query.start_date = options.startDate;
    }
    if (options?.endDate) {
      query.end_date = options.endDate;
    }
    if (options?.userName) {
      query.user_name = options.userName;
    }

    return await this.http.get<MonitoringListConversationsResponse>(
      `${internalApiPath}/_monitoring/conversations`,
      {
        query,
      }
    );
  }

  async getConversation(conversationId: string): Promise<MonitoringConversationResponse> {
    return await this.http.get<MonitoringConversationResponse>(
      `${internalApiPath}/_monitoring/conversations/${conversationId}`
    );
  }
}
