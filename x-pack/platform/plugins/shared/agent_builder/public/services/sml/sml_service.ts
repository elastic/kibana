/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  SmlSearchFilters,
  SmlSearchHttpResponse,
} from '@kbn/agent-context-layer-plugin/public';
import { smlSearchPath } from '@kbn/agent-context-layer-plugin/public';

/** Browser client for SML search (`/internal/agent_context_layer/sml/_search`). */
export class SmlService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async search(params: {
    query: string;
    size: number;
    skipContent?: boolean;
    filters?: SmlSearchFilters;
  }): Promise<SmlSearchHttpResponse> {
    return await this.http.post<SmlSearchHttpResponse>(smlSearchPath, {
      body: JSON.stringify({
        query: params.query,
        size: params.size,
        ...(params.skipContent === true ? { skip_content: true } : {}),
        ...(params.filters ? { filters: params.filters } : {}),
      }),
    });
  }
}
