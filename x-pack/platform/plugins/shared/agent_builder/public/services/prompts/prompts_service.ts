/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  CreateUserPromptPayload,
  CreateUserPromptResponse,
  DeleteUserPromptResponse,
  FindUserPromptsResponse,
  GetUserPromptResponse,
  UpdateUserPromptPayload,
  UpdateUserPromptResponse,
} from '../../../common/http_api/user_prompts';
import { internalApiPath } from '../../../common/constants';

export class PromptsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async find(params: { query?: string; page?: number; per_page?: number } = {}) {
    return await this.http.get<FindUserPromptsResponse>(`${internalApiPath}/user_prompts/_find`, {
      query: {
        ...(params.query && { query: params.query }),
        ...(params.page && { page: params.page }),
        ...(params.per_page && { per_page: params.per_page }),
      },
    });
  }

  async get(promptId: string) {
    return await this.http.get<GetUserPromptResponse>(
      `${internalApiPath}/user_prompts/${promptId}`
    );
  }

  async create(payload: CreateUserPromptPayload) {
    return await this.http.post<CreateUserPromptResponse>(`${internalApiPath}/user_prompts`, {
      body: JSON.stringify(payload),
    });
  }

  async update(promptId: string, payload: UpdateUserPromptPayload) {
    return await this.http.put<UpdateUserPromptResponse>(
      `${internalApiPath}/user_prompts/${promptId}`,
      {
        body: JSON.stringify(payload),
      }
    );
  }

  async delete(promptId: string) {
    return await this.http.delete<DeleteUserPromptResponse>(
      `${internalApiPath}/user_prompts/${promptId}`
    );
  }
}
