/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { aiIndexIdSchema } from './ki';

export const READ_TRACE_TRANSCRIPTS_STEP_ID = 'context-engine.readTraceTranscripts' as const;

/** The most rounds one read returns: each becomes a transcript the model reads. */
export const MAX_TRACE_TRANSCRIPTS_READ_SIZE = 200;
export const DEFAULT_TRACE_TRANSCRIPTS_READ_SIZE = 50;
/** Rounds that ended this recently are left for the next run: their spans may still be exporting. */
export const DEFAULT_TRACE_SETTLE_MINUTES = 5;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CURSOR_LENGTH = 512;

export const readTraceTranscriptsInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    since: z
      .string()
      .max(MAX_TIMESTAMP_LENGTH)
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Must be an ISO 8601 date.' })
      .describe('Read the rounds that ended since this ISO 8601 time'),
    after: z
      .string()
      .max(MAX_CURSOR_LENGTH)
      .optional()
      .describe(
        'The resume_after of the read that stopped at since: the trace id to continue after. Empty or omitted: read from since.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_TRACE_TRANSCRIPTS_READ_SIZE)
      .optional()
      .describe(
        `How many rounds to read, oldest first. Defaults to ${DEFAULT_TRACE_TRANSCRIPTS_READ_SIZE}.`
      ),
    settle_minutes: z
      .number()
      .int()
      .min(0)
      .max(60)
      .optional()
      .describe(
        `Leave rounds that ended this recently for the next run. Defaults to ${DEFAULT_TRACE_SETTLE_MINUTES}.`
      ),
  })
);

/** A round as dreaming reads it: the shape of the memories `applyDreamChanges` takes. */
export const traceTranscriptMemorySchema = lazySchema(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    content: z.string(),
    updated_at: z.string(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    permissions: z.object({
      kibana: z.object({ privileges: z.array(z.object({ space: z.string() })) }),
    }),
  })
);

export type TraceTranscriptMemory = z.infer<typeof traceTranscriptMemorySchema>;

export const readTraceTranscriptsOutputSchema = lazySchema(() =>
  z.object({
    memories: z
      .array(traceTranscriptMemorySchema)
      .describe(
        'One transcript per round, oldest first, shaped as the memories applyDreamChanges takes'
      ),
    resume_from: z
      .string()
      .describe(
        'Where the next read starts: the end of the last round read when size cut the read, else the end of the window read'
      ),
    resume_after: z
      .string()
      .optional()
      .describe('Set when size cut the read: the trace id to pass as after'),
    sources: z
      .array(
        z.object({
          type: z.string(),
          value: z.string(),
          rounds: z.number(),
          error: z.string().optional(),
        })
      )
      .describe('Each trace source of the AI index: how many rounds it found, or why it failed'),
    skipped: z
      .number()
      .describe('Rounds left out because their traces hold no conversation text to read'),
  })
);

export type ReadTraceTranscriptsOutput = z.infer<typeof readTraceTranscriptsOutputSchema>;

export const readTraceTranscriptsStepCommonDefinition: CommonStepDefinition<
  typeof readTraceTranscriptsInputSchema,
  typeof readTraceTranscriptsOutputSchema
> = {
  id: READ_TRACE_TRANSCRIPTS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.readTraceTranscripts.label', {
    defaultMessage: 'Read trace transcripts',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.readTraceTranscripts.description',
    {
      defaultMessage:
        'Rebuild the transcripts of the agent rounds found by the trace sources of an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: readTraceTranscriptsInputSchema,
  outputSchema: readTraceTranscriptsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.readTraceTranscripts.documentation.details',
      {
        defaultMessage:
          'Runs each trace source of the AI index as the workflow user to find the rounds that ' +
          'ended since the given time, then rebuilds each round from its spans: the user ' +
          'message, the tool calls and their results, and the answer. A round whose spans hold ' +
          'no conversation text, because the tracing privacy settings leave it out, is skipped. ' +
          'Each round is shaped as a dreaming memory of type trace.round with an id that starts ' +
          'with trace:, visible only in this space.',
      }
    ),
  },
};
