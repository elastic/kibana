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
import type { AiIndexAutomation, AiIndexProperties, AiIndexSource } from './http_api/ai_indices';
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
  memory_enabled: z.boolean().default(true),
  dest: aiIndexDestSchema,
  sources: z.array(aiIndexSourceSchema).max(MAX_AI_INDEX_SOURCES).default([]),
  automations: z.array(aiIndexAutomationSchema).max(MAX_AI_INDEX_AUTOMATIONS).default([]),
  traces: z.array(aiIndexTraceSchema).max(MAX_AI_INDEX_TRACES).default([]),
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
const [esqlSourceSchema, connectorSourceSchema] = aiIndexSourceSchema.options;

const fieldSummarySchema = z.object({
  path: z.string(),
  type: z.string(),
  searchable: z.boolean(),
  aggregatable: z.boolean(),
});

/** Added to a source when `_suggest_automation_context` has inspected it; absent otherwise. */
const sourceContextFieldsSchema = {
  row_count: z.number().optional(),
  sample_documents: z.array(z.record(z.string(), z.unknown())).optional(),
  fields: z.array(fieldSummarySchema).optional(),
  inspection_error: z.string().optional(),
};

export const aiIndexSourceContextSchema = z.discriminatedUnion('type', [
  esqlSourceSchema.extend(sourceContextFieldsSchema),
  connectorSourceSchema.extend(sourceContextFieldsSchema),
]);

/** Added to an automation when `_suggest_automation_context` has read its definition. */
export const aiIndexAutomationContextSchema = aiIndexAutomationSchema.extend({
  yaml: z.string().optional(),
  fetch_error: z.string().optional(),
});

/** Added to a trace when `_suggest_automation_context` has counted it. */
const traceContextFieldsSchema = {
  row_count: z.number().optional(),
  count_error: z.string().optional(),
};

export const aiIndexTraceContextSchema = z.discriminatedUnion('type', [
  elasticAgentTraceSchema.extend({ query: z.string() }).extend(traceContextFieldsSchema),
  indexTraceSchema.extend({ query: z.string() }).extend(traceContextFieldsSchema),
  esqlTraceSchema.extend({ query: z.string() }).extend(traceContextFieldsSchema),
]);

export const aiIndexSignalsSummarySchema = z.object({
  total: z.number(),
  by_tag: z.array(z.object({ tag: z.string(), count: z.number() })),
});

// Overwrite sources/automations/traces because an attachment carries read-time context
// (field summaries, sample documents, existing automation YAML, trace counts) alongside the
// derived/runtime query that traces always carry.
export const aiIndexAttachmentDataSchema = aiIndexPropertiesSchema
  .omit({ sources: true, automations: true, traces: true })
  .extend({
    id: aiIndexIdFieldSchema,
    sources: z.array(aiIndexSourceContextSchema).max(MAX_AI_INDEX_SOURCES),
    automations: z.array(aiIndexAutomationContextSchema).max(MAX_AI_INDEX_AUTOMATIONS),
    traces: z.array(aiIndexTraceContextSchema).max(MAX_AI_INDEX_TRACES),
    signals_summary: aiIndexSignalsSummarySchema.optional(),
  });

export interface AiIndexFieldSummary {
  path: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
}

/** A source plus what `_suggest_automation_context` found when it inspected it, if it did. */
export type AiIndexSourceContext = AiIndexSource & {
  row_count?: number;
  sample_documents?: Array<Record<string, unknown>>;
  fields?: AiIndexFieldSummary[];
  inspection_error?: string;
};

/** An automation plus its definition, if `_suggest_automation_context` read it. */
export type AiIndexAutomationContext = AiIndexAutomation & {
  yaml?: string;
  fetch_error?: string;
};

/** A trace plus its derived query and, if counted, how many rows it currently matches. */
export interface AiIndexTraceContext {
  type: 'elastic_agent' | 'index' | 'esql';
  value: string;
  query: string;
  row_count?: number;
  count_error?: string;
}

export interface AiIndexSignalsSummary {
  total: number;
  by_tag: Array<{ tag: string; count: number }>;
}

/**
 * Snapshot of an AI index attached to an Agent Builder conversation. Matches
 * {@link AiIndexProperties} plus the index id, with sources, automations and traces each carrying
 * whatever `_suggest_automation_context` found when preparing the "Suggest automation" attachment —
 * absent when nothing populated it.
 */
export type AiIndexAttachmentData = Omit<
  AiIndexProperties,
  'traces' | 'sources' | 'automations'
> & {
  id: string;
  sources: AiIndexSourceContext[];
  automations: AiIndexAutomationContext[];
  traces: AiIndexTraceContext[];
  signals_summary?: AiIndexSignalsSummary;
};
