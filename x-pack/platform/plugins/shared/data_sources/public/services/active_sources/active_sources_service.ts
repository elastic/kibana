/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ActiveSource } from '../../types/connector';
import { API_BASE_PATH } from '../../../common/constants';

interface ListDataSourcesResponse {
  dataSources: ActiveSource[];
  total: number;
}

export class ActiveSourcesService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all active data sources
   */
  async list(): Promise<ActiveSource[]> {
    const res = await this.http.get<ListDataSourcesResponse>(API_BASE_PATH);
    return res.dataSources;
  }
}
