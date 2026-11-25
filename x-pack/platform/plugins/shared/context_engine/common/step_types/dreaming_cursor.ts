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

export const GET_DREAMING_CURSOR_STEP_ID = 'context-engine.getDreamingCursor' as const;
export const SET_DREAMING_CURSOR_STEP_ID = 'context-engine.setDreamingCursor' as const;

/** What a dreaming run reads: the memories of an AI index, or the traces its sources record. */
export const DREAMING_CURSOR_SOURCES = ['memories', 'traces'] as const;
export type DreamingCursorSource = (typeof DREAMING_CURSOR_SOURCES)[number];

const MAX_CURSOR_FROM_LENGTH = 64;
const MAX_CURSOR_AFTER_LENGTH = 512;
const MAX_CURSOR_WINDOW_HOURS = 24 * 365;

const sourceSchema = lazySchema(() =>
  z.enum(DREAMING_CURSOR_SOURCES).describe('Whether the cursor is for memory or trace dreaming')
);

export const getDreamingCursorInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    source: sourceSchema,
    max_hours: z
      .number()
      .int()
      .min(1)
      .max(MAX_CURSOR_WINDOW_HOURS)
      .optional()
      .describe(
        'Longest window: a cursor older than this many hours is moved forward to that age, so a run after a long pause does not read everything since'
      ),
  })
);

export const getDreamingCursorOutputSchema = lazySchema(() =>
  z.object({
    found: z.boolean().describe('Whether a run has saved a cursor for this AI index and source'),
    from: z.string().optional().describe('ISO 8601 time to read from, when found'),
    after: z
      .string()
      .optional()
      .describe('Tie-breaker within `from`: the id of the last item read, when found'),
  })
);

export const setDreamingCursorInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    source: sourceSchema,
    from: z.string().min(1).max(MAX_CURSOR_FROM_LENGTH).describe('ISO 8601 time to read from next'),
    after: z
      .string()
      .max(MAX_CURSOR_AFTER_LENGTH)
      .optional()
      .describe('Tie-breaker within `from`: the id of the last item read'),
  })
);

export const setDreamingCursorOutputSchema = lazySchema(() =>
  z.object({
    from: z.string(),
    after: z.string().optional(),
  })
);

export type GetDreamingCursorOutput = z.infer<typeof getDreamingCursorOutputSchema>;
export type SetDreamingCursorOutput = z.infer<typeof setDreamingCursorOutputSchema>;

export const getDreamingCursorStepCommonDefinition: CommonStepDefinition<
  typeof getDreamingCursorInputSchema,
  typeof getDreamingCursorOutputSchema
> = {
  id: GET_DREAMING_CURSOR_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.getDreamingCursor.label', {
    defaultMessage: 'Get dreaming cursor',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.getDreamingCursor.description', {
    defaultMessage: 'Read where the last dreaming page of an AI index stopped.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: getDreamingCursorInputSchema,
  outputSchema: getDreamingCursorOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.getDreamingCursor.documentation.details',
      {
        defaultMessage:
          'Returns found: false when no run has saved a cursor yet. The cursor is kept with the ' +
          'AI index and moves when setDreamingCursor runs, whether or not the run that saved it ' +
          'finished, so a run that stops early resumes from its last saved page.',
      }
    ),
  },
};

export const setDreamingCursorStepCommonDefinition: CommonStepDefinition<
  typeof setDreamingCursorInputSchema,
  typeof setDreamingCursorOutputSchema
> = {
  id: SET_DREAMING_CURSOR_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.setDreamingCursor.label', {
    defaultMessage: 'Set dreaming cursor',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.setDreamingCursor.description', {
    defaultMessage: 'Save where a dreaming page of an AI index stopped.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: setDreamingCursorInputSchema,
  outputSchema: setDreamingCursorOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.setDreamingCursor.documentation.details',
      {
        defaultMessage:
          'Saves the cursor with the AI index. Run it after a page is written, so a timeout or ' +
          'failure later in the run loses at most the page in progress and skips nothing.',
      }
    ),
  },
};
