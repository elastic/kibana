/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_ID_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from './constants';

export const dependencyEdgeSchema = z.object({
  source: z.string().max(MAX_ID_LENGTH),
  target: z.string().max(MAX_ID_LENGTH),
  protocol: z.string().max(MAX_ID_LENGTH).optional(),
  exposure: z.string().max(MAX_ID_LENGTH).optional(),
});

export const infraComponentSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  workloads: z.array(z.string().max(MAX_ID_LENGTH)).optional(),
  exposure: z.string().max(MAX_ID_LENGTH).optional(),
});

export const causeKiSchema = z.object({
  name: z.string().max(MAX_TITLE_LENGTH).optional(),
  stream_name: z.string().max(MAX_ID_LENGTH).optional(),
});

export const evidenceSchema = z.object({
  rule_name: z.string().max(MAX_RULE_NAME_LENGTH).optional(),
  rule_uuid: z.string().max(MAX_ID_LENGTH).optional(),
  result: z.string().max(MAX_TEXT_LENGTH).optional(),
  description: z.string().max(MAX_TEXT_LENGTH).optional(),
  stream_name: z.string().max(MAX_ID_LENGTH).optional(),
  row_count: z.number().optional(),
  collected_at: z.string().max(MAX_ID_LENGTH).optional(),
  esql_query: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  confirmed: z.boolean().optional(),
});
