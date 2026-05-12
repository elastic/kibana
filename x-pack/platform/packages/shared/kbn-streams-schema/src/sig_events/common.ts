/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const dependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  protocol: z.string().optional(),
  exposure: z.enum(['exposed', 'not_exposed']).optional(),
});

export const infraComponentSchema = z.object({
  title: z.string().optional(),
  workloads: z.array(z.string()).optional(),
  exposure: z.enum(['exposed', 'not_exposed']).optional(),
});

export const causeKiSchema = z.object({
  name: z.string().optional(),
  stream_name: z.string().optional(),
});

export const evidenceSchema = z.object({
  rule_name: z.string().optional(),
  result: z.enum(['found', 'empty', 'error']).optional(),
  description: z.string().optional(),
  stream_name: z.string().optional(),
  row_count: z.number().int().optional(),
  collected_at: z.string().optional(),
  esql_query: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
});
