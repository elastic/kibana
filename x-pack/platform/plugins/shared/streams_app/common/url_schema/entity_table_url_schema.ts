/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ENTITY_TABLE_PAGE_SIZES = [25, 50, 100] as const;
export type EntityTablePageSize = (typeof ENTITY_TABLE_PAGE_SIZES)[number];

const ENTITY_TABLE_QUERY_MAX_LENGTH = 1024;
const ENTITY_TABLE_SORT_FIELD_MAX_LENGTH = 128;

export interface EntityTableUrlSchema {
  query?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  pageIndex?: number;
  pageSize?: EntityTablePageSize;
}

export const entityTableUrlSchema = z.object({
  query: z.string().max(ENTITY_TABLE_QUERY_MAX_LENGTH).optional(),
  sortField: z.string().max(ENTITY_TABLE_SORT_FIELD_MAX_LENGTH).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  pageIndex: z.number().int().nonnegative().optional(),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]).optional(),
}) satisfies z.ZodType<EntityTableUrlSchema>;
