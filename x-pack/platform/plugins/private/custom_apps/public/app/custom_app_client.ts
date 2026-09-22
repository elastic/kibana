/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { CustomAppDefinition, CustomAppListItem } from '../../common/app_definition';
import { API_BASE_PATH } from '../../common/constants';

export interface StoredCustomApp {
  id: string;
  updatedAt?: string;
  definition: CustomAppDefinition;
}

export class CustomAppClient {
  constructor(private readonly http: HttpStart) {}

  list = async (): Promise<CustomAppListItem[]> => {
    const { items } = await this.http.get<{ items: CustomAppListItem[] }>(API_BASE_PATH);
    return items;
  };

  get = async (id: string): Promise<StoredCustomApp> =>
    this.http.get<StoredCustomApp>(`${API_BASE_PATH}/${encodeURIComponent(id)}`);

  create = async (definition: CustomAppDefinition): Promise<StoredCustomApp> =>
    this.http.post<StoredCustomApp>(API_BASE_PATH, { body: JSON.stringify(definition) });

  update = async (id: string, definition: CustomAppDefinition): Promise<void> => {
    await this.http.put(`${API_BASE_PATH}/${encodeURIComponent(id)}`, {
      body: JSON.stringify(definition),
    });
  };

  delete = async (id: string): Promise<void> => {
    await this.http.delete(`${API_BASE_PATH}/${encodeURIComponent(id)}`);
  };
}
