/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  GetIndexTemplatesResponse,
  SimulateIndexTemplateResponse,
} from '@kbn/index-management-shared-types';
import { API_BASE_PATH, INTERNAL_API_BASE_PATH } from '../../common';
import { sendRequest } from '../shared_imports';

/**
 * Index Management public API service
 */
export class PublicApiService {
  private http: HttpSetup;

  /**
   * constructor
   * @param http http dependency
   */
  constructor(http: HttpSetup) {
    this.http = http;
  }

  /**
   * Gets a list of all the enrich policies
   */
  getAllEnrichPolicies() {
    return sendRequest(this.http, {
      path: `${INTERNAL_API_BASE_PATH}/enrich_policies`,
      method: 'get',
    });
  }

  /**
   * Fetches all index templates (composable and legacy) available in Index Management.
   */
  getIndexTemplates(options?: { signal?: AbortSignal }) {
    return this.http.get<GetIndexTemplatesResponse>(`${API_BASE_PATH}/index_templates`, {
      signal: options?.signal,
    });
  }

  /**
   * Simulates an index template by name.
   * Returns the resolved template configuration that would be applied to matching indices.
   */
  simulateIndexTemplate(options: { templateName: string; signal?: AbortSignal }) {
    return this.http.post<SimulateIndexTemplateResponse>(
      `${API_BASE_PATH}/index_templates/simulate/${encodeURIComponent(options.templateName)}`,
      {
        signal: options.signal,
      }
    );
  }
}
