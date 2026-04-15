/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateTemplateInput,
  PatchTemplateInput,
} from '../../../common/types/domain/template/v1';
import type { TemplatesFindRequest } from '../../../common/types/api/template/v1';

export type TemplatesURLQueryParams = Partial<TemplatesFindRequest>;

export type TemplateRequest = CreateTemplateInput;

export type TemplateUpdateRequest = PatchTemplateInput;

export interface DeleteTemplateResponse {
  success: boolean;
}

export interface BulkDeleteTemplatesResponse {
  success: boolean;
  deleted: string[];
  errors: Array<{ id: string; error: string }>;
}

export interface ExportTemplateResponse {
  filename: string;
  content: string;
}

export interface BulkExportTemplatesResponse {
  filename: string;
  content: string;
}
