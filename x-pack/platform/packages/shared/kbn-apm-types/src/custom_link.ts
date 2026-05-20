/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../es_fields';

export const FILTER_OPTIONS = [
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
] as const;

export type FilterKey = (typeof FILTER_OPTIONS)[number];

export interface CustomLinkES {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  [SERVICE_NAME]?: string[];
  [SERVICE_ENVIRONMENT]?: string[];
  [TRANSACTION_NAME]?: string[];
  [TRANSACTION_TYPE]?: string[];
}

export interface Filter {
  id?: string;
  key: FilterKey | '';
  value: string;
}

export interface CustomLink {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  filters?: Filter[];
}
