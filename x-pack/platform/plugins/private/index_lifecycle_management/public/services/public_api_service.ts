/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { API_BASE_PATH } from '../../common/constants';

/**
 * Index Lifecycle Management public API service
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
   * Fetches all ILM policies available in Index Lifecycle Management.
   */
  getPolicies(options?: { signal?: AbortSignal }) {
    return this.http.get<PolicyFromES[]>(`${API_BASE_PATH}/policies`, {
      signal: options?.signal,
    });
  }
}
