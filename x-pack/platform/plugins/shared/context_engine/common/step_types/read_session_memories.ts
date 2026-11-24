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
import { traceTranscriptMemorySchema } from './read_trace_transcripts';

export const READ_SESSION_MEMORIES_STEP_ID = 'context-engine.readSessionMemories' as const;

/** The most revisions one read looks at. */
export const MAX_SESSION_MEMORIES_READ_SIZE = 1000;
export const DEFAULT_SESSION_MEMORIES_READ_SIZE = 500;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CURSOR_LENGTH = 512;

export const readSessionMemoriesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    since: z
      .string()
      .max(MAX_TIMESTAMP_LENGTH)
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Must be an ISO 8601 date.' })
      .describe('Read the memories remembered or revised since this ISO 8601 time'),
    after: z
      .string()
      .max(MAX_CURSOR_LENGTH)
      .optional()
      .describe(
        'The resume_after_id of the read that stopped at since: the memory id to continue after. Empty or omitted: read from since.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_SESSION_MEMORIES_READ_SIZE)
      .optional()
      .describe(
        `How many revisions to look at, oldest first. Defaults to ${DEFAULT_SESSION_MEMORIES_READ_SIZE}.`
      ),
  })
);

export const readSessionMemoriesOutputSchema = lazySchema(() =>
  z.object({
    memories: z
      .array(traceTranscriptMemorySchema)
      .describe(
        'The latest revision of each memory, oldest first, shaped as the memories applyDreamChanges takes'
      ),
    resume_from: z
      .string()
      .describe('Set when size cut the read: where the next read starts. Empty otherwise'),
    resume_after_id: z
      .string()
      .describe('Set when size cut the read: the memory id to pass as after. Empty otherwise'),
  })
);

export type ReadSessionMemoriesOutput = z.infer<typeof readSessionMemoriesOutputSchema>;

export const readSessionMemoriesStepCommonDefinition: CommonStepDefinition<
  typeof readSessionMemoriesInputSchema,
  typeof readSessionMemoriesOutputSchema
> = {
  id: READ_SESSION_MEMORIES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.readSessionMemories.label', {
    defaultMessage: 'Read session memories',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.readSessionMemories.description',
    {
      defaultMessage:
        'Read the session memories agents saved for an AI index, for dreaming to consolidate.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: readSessionMemoriesInputSchema,
  outputSchema: readSessionMemoriesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.readSessionMemories.documentation.details',
      {
        defaultMessage:
          'Reads the session memory data stream for the memories that list the AI index and were ' +
          'remembered or revised since the given time, across all users of the space. A memory ' +
          'revised since is read once, as its latest revision, and a forgotten memory is left ' +
          'out. Each is shaped as a dreaming memory of type memory.session with an id that ' +
          'starts with session-memory:, visible only in this space.',
      }
    ),
  },
};
