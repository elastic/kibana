/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { aiIndexHttpItemSchema } from './ai_index_schema';

/**
 * The type of backing store an AI index is attached to. `index` covers a
 * concrete index name or an index pattern (e.g. `foo`, `foo,bar`, `foo*`).
 */
export type AiIndexType = 'data_stream' | 'index';

export interface AiIndexDest {
  type: AiIndexType;
  value: string;
}
export type AiIndexSourceType = 'esql';
export interface AiIndexSource {
  type: AiIndexSourceType;
  value: string;
}
export type AiIndexAutomationType = 'workflow';
export interface AiIndexAutomation {
  type: AiIndexAutomationType;
  value: string;
}

export type AiIndexHttpItem = z.infer<typeof aiIndexHttpItemSchema>;
export type GetAiIndexResponse = AiIndexHttpItem;

/** Properties used when creating or updating an AI index (excludes server-set fields). */
export type AiIndexProperties = Omit<AiIndexHttpItem, 'id' | 'date_created' | 'date_modified'>;

export interface ListAiIndexResponse {
  ai_indices: AiIndexHttpItem[];
}

export interface PutAiIndexResponse {
  status: 'created' | 'updated';
}

export interface DeleteAiIndexResponse {
  acknowledged: boolean;
}
