/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TemplateSchema } from '../../domain/template/v1';
/**
 * Sort field for templates.
 *
 * Keep this list aligned with indexed scalar mapping fields in the template SO type.
 */
export const TemplateSortFieldSchema = z.enum([
  'templateId',
  'name',
  'templateVersion',
  'owner',
  'deletedAt',
  'author',
  'usageCount',
  'fieldCount',
  'lastUsedAt',
  'isDefault',
  'isLatest',
]);

export type TemplateSortField = z.infer<typeof TemplateSortFieldSchema>;

/**
 * Sort order
 */
export const SortOrderSchema = z.enum(['asc', 'desc']);

export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Request schema for finding/listing templates
 */
export const TemplatesFindRequestSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  sortField: z.optional(TemplateSortFieldSchema).default('name'),
  sortOrder: z.optional(SortOrderSchema).default('asc'),
  search: z.optional(z.string()).default(''),
  tags: z.optional(z.array(z.string())).default([]),
  author: z.optional(z.array(z.string())).default([]),
  isDeleted: z.optional(z.boolean()).default(false),
});

export type TemplatesFindRequest = z.infer<typeof TemplatesFindRequestSchema>;

/**
 * Response schema for finding/listing templates
 */
export const TemplatesFindResponseSchema = z.object({
  templates: z.array(TemplateSchema),
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
});

export type TemplatesFindResponse = z.infer<typeof TemplatesFindResponseSchema>;
