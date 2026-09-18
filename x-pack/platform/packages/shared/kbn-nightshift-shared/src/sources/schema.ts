/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const MAX_SOURCE_TITLE_LENGTH = 256;
export const MAX_SOURCE_DESCRIPTION_LENGTH = 2000;
export const MAX_SOURCE_ESQL_LENGTH = 10_000;
export const MAX_SOURCE_TAGS = 20;
export const MAX_SOURCE_TAG_LENGTH = 64;
const MAX_SOURCES_PER_PAGE = 100;
const DEFAULT_SOURCES_PER_PAGE = 25;

export type SourceHealth = 'ok' | 'view_missing' | 'view_drift' | 'unresolvable' | 'unknown';

const sourceTitleSchema = z.string().trim().min(1).max(MAX_SOURCE_TITLE_LENGTH);
const sourceDescriptionSchema = z.string().max(MAX_SOURCE_DESCRIPTION_LENGTH);
const sourceEsqlSchema = z.string().trim().min(1).max(MAX_SOURCE_ESQL_LENGTH);
const sourceTagsSchema = z
  .array(z.string().trim().min(1).max(MAX_SOURCE_TAG_LENGTH))
  .max(MAX_SOURCE_TAGS);

const nightshiftSourceSchema = z.object({
  id: z.string(),
  title: sourceTitleSchema,
  description: sourceDescriptionSchema.optional(),
  tags: sourceTagsSchema,
  esql: sourceEsqlSchema,
  view_name: z.string(),
  enabled: z.boolean(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  esql_updated_at: z.string(),
});

export type NightshiftSource = z.infer<typeof nightshiftSourceSchema>;

export interface SourceWithHealth {
  source: NightshiftSource;
  health: SourceHealth;
}

export const createSourceRequestSchema = z.object({
  title: sourceTitleSchema,
  description: sourceDescriptionSchema.optional(),
  tags: sourceTagsSchema.default([]),
  esql: sourceEsqlSchema,
});

/** Wire shape callers send; `tags` may be omitted on create (defaults to `[]`). */
export type CreateSourceRequest = z.input<typeof createSourceRequestSchema>;

/** Parsed shape the server works with; defaults applied. */
export type SourceInput = z.output<typeof createSourceRequestSchema>;

/** On update, `tags` is required so omitting it is a validation error instead of silently clearing. */
export const updateSourceRequestSchema = z.object({
  title: sourceTitleSchema,
  description: sourceDescriptionSchema.optional(),
  tags: sourceTagsSchema,
  esql: sourceEsqlSchema,
});

export const listSourcesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SOURCES_PER_PAGE)
    .default(DEFAULT_SOURCES_PER_PAGE),
  search: z.string().max(MAX_SOURCE_TITLE_LENGTH).optional(),
  enabled: z.stringbool().optional(),
});

export interface ListSourcesResponse {
  sources: SourceWithHealth[];
  total: number;
  page: number;
  per_page: number;
}

export interface SourceMutationResponse {
  source: NightshiftSource;
}

export interface DeleteSourceResponse {
  acknowledged: true;
}
