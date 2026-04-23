/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';

/**
 * Response shape for `POST /internal/semantic_layer/sml/_search`.
 * Mirrors `SmlSearchHttpResponse` from `@kbn/semantic-layer-plugin/common/http_api/sml`.
 * Declared inline because the semantic_layer plugin is server-only (`browser: false`).
 */
interface SmlSearchHttpResponse {
  total: number;
  results: Array<{
    id: string;
    type: string;
    origin_id: string;
    title: string;
    score: number;
    content?: string;
  }>;
}

/**
 * Must stay in sync with the route registered in
 * `@kbn/semantic-layer-plugin/server/routes/search.ts`.
 */
const SEMANTIC_LAYER_SEARCH_PATH = '/internal/semantic_layer/sml/_search';

/** Browser client for SML search (`/internal/semantic_layer/sml/_search`). */
export class SmlService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async search(params: {
    query: string;
    size: number;
    skipContent?: boolean;
  }): Promise<SmlSearchHttpResponse> {
    return await this.http.post<SmlSearchHttpResponse>(SEMANTIC_LAYER_SEARCH_PATH, {
      body: JSON.stringify({
        query: params.query,
        size: params.size,
        ...(params.skipContent === true ? { skip_content: true } : {}),
      }),
    });
  }
}
