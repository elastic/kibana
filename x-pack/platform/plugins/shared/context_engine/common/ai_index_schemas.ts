/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDEX_TRACES,
  MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS,
  MAX_AI_INDEX_TRACE_VALUE_LENGTH,
} from './constants';
import type { AiIndexProperties, AiIndexTraceWithQuery } from './http_api/ai_indices';
import { validateAiIndexId } from './validation';

export const aiIndexDestSchema = z.object({
  type: z.enum(['data_stream', 'index']),
  value: z.string().min(1).max(MAX_AI_INDEX_DEST_VALUE_LENGTH),
});

export const aiIndexAutomationSchema = z.object({
  type: z.literal('workflow'),
  value: z.string().max(MAX_AI_INDEX_AUTOMATION_LENGTH),
});

const aiIndexEsqlSourceSchema = z.object({
  type: z.literal('esql'),
  value: z.string().max(MAX_AI_INDEX_SOURCE_VALUE_LENGTH),
});

const aiIndexConnectorSourceSchema = z.object({
  type: z.literal('connector'),
  value: z.string().min(1).max(MAX_AI_INDEX_SOURCE_VALUE_LENGTH),
});

export const aiIndexSourceSchema = z.discriminatedUnion('type', [
  aiIndexEsqlSourceSchema,
  aiIndexConnectorSourceSchema,
]);

export const aiIndexTraceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('elastic_agent'),
    value: z.string().min(1).max(MAX_AI_INDEX_TRACE_VALUE_LENGTH),
  }),
  z.object({
    type: z.literal('index'),
    value: z
      .string()
      .min(1)
      .max(MAX_AI_INDEX_TRACE_VALUE_LENGTH)
      .refine((value) => value.split(',').length <= MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS, {
        message: `value must contain at most ${MAX_AI_INDEX_TRACE_INDEX_EXPRESSIONS} comma-separated expressions`,
      }),
  }),
  z.object({
    type: z.literal('esql'),
    value: z.string().min(1).max(MAX_AI_INDEX_TRACE_VALUE_LENGTH),
  }),
]);

export const aiIndexPropertiesSchema = z.object({
  description: z.string().max(MAX_AI_INDEX_DESCRIPTION_LENGTH).optional(),
  dest: aiIndexDestSchema,
  sources: z.array(aiIndexSourceSchema).max(MAX_AI_INDEX_SOURCES),
  automations: z.array(aiIndexAutomationSchema).max(MAX_AI_INDEX_AUTOMATIONS),
  traces: z.array(aiIndexTraceSchema).max(MAX_AI_INDEX_TRACES),
});

export const aiIndexIdFieldSchema = z
  .string()
  .min(1)
  .max(MAX_AI_INDEX_ID_LENGTH)
  .superRefine((value, ctx) => {
    const validationError = validateAiIndexId(value);
    if (validationError) {
      ctx.addIssue({
        code: 'custom',
        message: validationError,
      });
    }
  });

const [elasticAgentTraceSchema, indexTraceSchema, esqlTraceSchema] = aiIndexTraceSchema.options;
// Overwrite traces because we need to include the derived/runtime query for the attachment data
export const aiIndexAttachmentDataSchema = aiIndexPropertiesSchema.omit({ traces: true }).extend({
  id: aiIndexIdFieldSchema,
  traces: z
    .array(
      z.discriminatedUnion('type', [
        elasticAgentTraceSchema.extend({ query: z.string() }),
        indexTraceSchema.extend({ query: z.string() }),
        esqlTraceSchema.extend({ query: z.string() }),
      ])
    )
    .max(MAX_AI_INDEX_TRACES),
});

/**
 * Snapshot of an AI index attached to an Agent Builder conversation.
 * Matches {@link AiIndexProperties} plus the index id, with read-time traces
 * that include the derived ES|QL `query`.
 */
export type AiIndexAttachmentData = Omit<AiIndexProperties, 'traces'> & {
  id: string;
  traces: AiIndexTraceWithQuery[];
};
