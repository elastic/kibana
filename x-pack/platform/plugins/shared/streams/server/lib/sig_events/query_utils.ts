/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { PaginatedResponse } from '../../../common/pagination';

export interface CommonSearchOptions {
  /** ISO 8601 formatted datetime */
  from?: string;
  /** ISO 8601 formatted datetime */
  to?: string;
}

export interface PaginatedSearchOptions extends CommonSearchOptions {
  page?: number;
  perPage?: number;
}
