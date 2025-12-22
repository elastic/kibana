/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin';
import { API_BASE_PATH } from '../../common/constants';

/**
 * Service for interacting with Data Connector types (from Data Sources Registry).
 *
 * This service accesses the Data Sources Registry via our plugin's server routes,
 * which in turn access the DataCatalog directly via plugin dependencies.
 */
export class DataConnectorTypesService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all registered connector types (available for creation)
   */
  async list(): Promise<DataTypeDefinition[]> {
    return await this.http.get<DataTypeDefinition[]>(`${API_BASE_PATH}/types`);
  }

  /**
   * Get a specific connector type by ID
   */
  async get(id: string): Promise<DataTypeDefinition> {
    return await this.http.get<DataTypeDefinition>(`${API_BASE_PATH}/types/${id}`);
  }
}
