/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { DataSource } from '@kbn/data-catalog-plugin';
import { API_BASE_PATH } from '@kbn/data-catalog-plugin';

/**
 * Service for interacting with available Data Sources (from Data Catalog).
 *
 */
export class AvailableDataSourcesService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all registered data sources (available for creation)
   */
  async list(): Promise<DataSource[]> {
    return await this.http.get<DataSource[]>(`${API_BASE_PATH}/types`);
  }

  /**
   * Get a specific data source type by ID
   */
  async get(id: string): Promise<DataSource> {
    return await this.http.get<DataSource>(`${API_BASE_PATH}/types/${id}`);
  }
}
