/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { FindUserPromptsResponse } from '../../../common/http_api/user_prompts';
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
}
