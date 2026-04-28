/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { SmlSearchHttpResponse } from '@kbn/semantic-layer-plugin/common/http_api/sml';
import { smlSearchPath } from '@kbn/semantic-layer-plugin/common/constants';

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
    return await this.http.post<SmlSearchHttpResponse>(smlSearchPath, {
      body: JSON.stringify({
        query: params.query,
        size: params.size,
        ...(params.skipContent === true ? { skip_content: true } : {}),
      }),
    });
  }
}
