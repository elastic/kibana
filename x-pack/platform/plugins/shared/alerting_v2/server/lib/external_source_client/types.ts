/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExternalSourceData,
  FindExternalSourcesSortField,
  ExternalSourceResponse,
  ExternalSourceType,
  UpdateExternalSourceData,
} from '@kbn/alerting-v2-schemas';

export interface CreateExternalSourceParams {
  data: CreateExternalSourceData;
}

export interface UpdateExternalSourceParams {
  id: string;
  data: UpdateExternalSourceData;
}

export interface FindExternalSourcesParams {
  page?: number;
  perPage?: number;
  search?: string;
  sortField?: FindExternalSourcesSortField;
  sortOrder?: 'asc' | 'desc';
  /** Only returns the external sources that use this connector. */
  connectorId?: string;
  /** Only returns the external sources that receive events from this source. */
  type?: ExternalSourceType;
}

export interface FindExternalSourcesResponse {
  items: ExternalSourceResponse[];
  total: number;
  page: number;
  per_page: number;
}
