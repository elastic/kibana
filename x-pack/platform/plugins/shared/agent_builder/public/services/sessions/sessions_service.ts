/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { internalApiPath } from '../../../common/constants';

export class SessionsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list({ agentId }: { agentId?: string }): Promise<ConversationWithoutRounds[]> {
    const response = await this.http.get<{ sessions: ConversationWithoutRounds[] }>(
      `${internalApiPath}/sessions`,
      { query: { agent_id: agentId } }
    );
    return response.sessions;
  }

  async get(sessionId: string): Promise<Conversation> {
    return this.http.get<Conversation>(`${internalApiPath}/sessions/${sessionId}`);
  }

  async create(params: {
    agent_id: string;
    name: string;
    system_prompt_override?: string;
    connector_id?: string;
    ttl_seconds?: number;
  }): Promise<Conversation> {
    return this.http.post<Conversation>(`${internalApiPath}/sessions`, {
      body: JSON.stringify(params),
    });
  }

  async terminate(sessionId: string): Promise<void> {
    await this.http.delete(`${internalApiPath}/sessions/${sessionId}`);
  }

  async sendMessage(sessionId: string, message: string): Promise<{ status: string }> {
    return this.http.post<{ status: string }>(`${internalApiPath}/sessions/${sessionId}/messages`, {
      body: JSON.stringify({ message }),
    });
  }
}
