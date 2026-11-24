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
import {
  DEFAULT_TRACE_SETTLE_MINUTES,
  DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS,
  DEFAULT_TRACE_TRANSCRIPTS_READ_TOKENS,
  MAX_TRACE_TRANSCRIPTS_BATCH_TOKENS,
  MAX_TRACE_TRANSCRIPTS_READ_TOKENS,
  traceTranscriptMemorySchema,
} from './read_trace_transcripts';

export const READ_SESSION_TRANSCRIPTS_STEP_ID = 'context-engine.readSessionTranscripts' as const;

/** The most events one read looks at: each turn they belong to becomes a transcript. */
export const MAX_SESSION_TRANSCRIPTS_READ_SIZE = 10_000;
export const DEFAULT_SESSION_TRANSCRIPTS_READ_SIZE = 500;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CURSOR_LENGTH = 512;

export const readSessionTranscriptsInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    since: z
      .string()
      .max(MAX_TIMESTAMP_LENGTH)
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Must be an ISO 8601 date.' })
      .describe('Read the events saved since this ISO 8601 time'),
    after: z
      .string()
      .max(MAX_CURSOR_LENGTH)
      .optional()
      .describe(
        'The resume_after of the read that stopped at since: the event to continue after. Empty or omitted: read from since.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_SESSION_TRANSCRIPTS_READ_SIZE)
      .optional()
      .describe(
        `How many events to look at, oldest first. Defaults to ${DEFAULT_SESSION_TRANSCRIPTS_READ_SIZE}.`
      ),
    max_tokens: z
      .number()
      .int()
      .min(1)
      .max(MAX_TRACE_TRANSCRIPTS_READ_TOKENS)
      .optional()
      .describe(
        `Stop the read before its transcripts exceed this many estimated tokens. Defaults to ${DEFAULT_TRACE_TRANSCRIPTS_READ_TOKENS}.`
      ),
    batch_tokens: z
      .number()
      .int()
      .min(1)
      .max(MAX_TRACE_TRANSCRIPTS_BATCH_TOKENS)
      .optional()
      .describe(
        `The most estimated tokens of one batch: what one model call reads. Defaults to ${DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS}.`
      ),
    settle_minutes: z
      .number()
      .int()
      .min(0)
      .max(60)
      .optional()
      .describe(
        `Leave events saved this recently for the next run: their turn may still be running. Defaults to ${DEFAULT_TRACE_SETTLE_MINUTES}.`
      ),
  })
);

export const readSessionTranscriptsOutputSchema = lazySchema(() =>
  z.object({
    memories: z
      .array(traceTranscriptMemorySchema)
      .describe(
        'One transcript per turn, oldest first, shaped as the memories applyDreamChanges takes'
      ),
    batches: z
      .array(z.array(traceTranscriptMemorySchema))
      .describe(
        'The memories in batches for the model, a call each: each session together and in order, whole sessions up to batch_tokens'
      ),
    resume_from: z
      .string()
      .describe(
        'Where the next read starts: the last event read when size or max_tokens cut the read, else the end of the window read'
      ),
    resume_after: z
      .string()
      .optional()
      .describe('Set when size or max_tokens cut the read: the event to pass as after'),
    skipped: z.number().describe('Turns left out because nobody said anything in them'),
  })
);

export type ReadSessionTranscriptsOutput = z.infer<typeof readSessionTranscriptsOutputSchema>;

export const readSessionTranscriptsStepCommonDefinition: CommonStepDefinition<
  typeof readSessionTranscriptsInputSchema,
  typeof readSessionTranscriptsOutputSchema
> = {
  id: READ_SESSION_TRANSCRIPTS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.readSessionTranscripts.label', {
    defaultMessage: 'Read session transcripts',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.readSessionTranscripts.description',
    {
      defaultMessage:
        'Rebuild the transcripts of the agent turns saved as session events for an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: readSessionTranscriptsInputSchema,
  outputSchema: readSessionTranscriptsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.readSessionTranscripts.documentation.details',
      {
        defaultMessage:
          'Reads the session events data stream for the events that list the AI index and were ' +
          'saved since the given time, across all users of the space, then rebuilds each turn ' +
          'they belong to from all its events: the user message, the tool calls and their ' +
          'results, and the answer. A turn that continues after the read is read again, whole, ' +
          'by a later read. Each turn is shaped as a dreaming memory of type session.turn with ' +
          'an id that starts with session:, visible only in this space.',
      }
    ),
  },
};
