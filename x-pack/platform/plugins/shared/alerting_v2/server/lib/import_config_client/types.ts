/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateImportConfigData,
  FindImportConfigsSortField,
  ImportConfigResponse,
  UpdateImportConfigData,
} from '@kbn/alerting-v2-schemas';

export interface CreateImportConfigParams {
  data: CreateImportConfigData;
}

export interface UpdateImportConfigParams {
  id: string;
  data: UpdateImportConfigData;
}

export interface FindImportConfigsParams {
  page?: number;
  perPage?: number;
  search?: string;
  sortField?: FindImportConfigsSortField;
  sortOrder?: 'asc' | 'desc';
  /** Only returns the import configs that use this connector. */
  connectorId?: string;
}

export interface FindImportConfigsResponse {
  items: ImportConfigResponse[];
  total: number;
  page: number;
  per_page: number;
}
