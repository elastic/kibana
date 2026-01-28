/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Template {
  key: string;
  name: string;
  description: string;
  solution: 'security' | 'observability' | 'other';
  fields: number;
  tags: string[];
  lastUpdate: string;
  lastTimeUsed: string;
  usage: number;
  isDefault: boolean;
}

export interface TemplatesFindResponse {
  templates: Template[];
  page: number;
  perPage: number;
  total: number;
}

export type TemplateRequest = Omit<Template, 'key' | 'lastUpdate' | 'lastTimeUsed' | 'usage'>;

export type TemplateUpdateRequest = Partial<TemplateRequest>;

export interface DeleteTemplateResponse {
  success: boolean;
}

export interface ExportTemplateResponse {
  filename: string;
  content: string;
}

export type SortField = keyof Template;
export type SortOrder = 'asc' | 'desc';

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortField;
  sortOrder: SortOrder;
  search: string;
}
