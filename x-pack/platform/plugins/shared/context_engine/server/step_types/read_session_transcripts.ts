/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  DEFAULT_TRANSCRIPT_SETTLE_MINUTES,
  DEFAULT_TRANSCRIPTS_BATCH_TOKENS,
  DEFAULT_TRANSCRIPTS_READ_TOKENS,
} from '../../common/step_types/dreaming_memory';
import {
  DEFAULT_SESSION_TRANSCRIPTS_READ_SIZE,
  readSessionTranscriptsStepCommonDefinition,
} from '../../common/step_types/read_session_transcripts';
import { batchByConversation } from '../dreaming/transcript_batches';
import { readSessionTranscripts } from '../dreaming/session_transcripts';
import type { DreamingStepDependencies } from './helpers';
import { assertAiIndexReadable } from './read_session_helpers';

const MINUTE_MS = 60 * 1000;

/**
 * Reads the turns saved as session events for an AI index as transcripts. The store is read as the
 * internal user, after checking that the workflow user can read AI indices in the space.
 */
export const getReadSessionTranscriptsStepDefinition = (
  deps: DreamingStepDependencies,
  { getCurrentDate = () => new Date() }: { getCurrentDate?: () => Date } = {}
) =>
  createServerStepDefinition({
    ...readSessionTranscriptsStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const {
        ai_index_id: aiIndexId,
        since,
        after,
        size = DEFAULT_SESSION_TRANSCRIPTS_READ_SIZE,
        max_tokens: maxTokens = DEFAULT_TRANSCRIPTS_READ_TOKENS,
        batch_tokens: batchTokens = DEFAULT_TRANSCRIPTS_BATCH_TOKENS,
        settle_minutes: settleMinutes = DEFAULT_TRANSCRIPT_SETTLE_MINUTES,
      } = context.input;
      if (!(await assertAiIndexReadable(deps, context, aiIndexId, spaceId))) {
        return { output: { memories: [], batches: [], resume_from: since, skipped: 0 } };
      }

      const until = new Date(getCurrentDate().getTime() - settleMinutes * MINUTE_MS).toISOString();
      const output = await readSessionTranscripts({
        sessionEvents: await deps.getSessionEventsService(),
        spaceId,
        aiIndexId,
        since,
        ...(after && { after }),
        until,
        size,
        maxTokens,
      });
      return { output: { ...output, batches: batchByConversation(output.memories, batchTokens) } };
    },
  });
