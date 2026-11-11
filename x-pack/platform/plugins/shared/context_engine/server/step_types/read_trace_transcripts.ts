/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  DEFAULT_TRACE_SETTLE_MINUTES,
  DEFAULT_TRACE_TRANSCRIPTS_READ_SIZE,
  readTraceTranscriptsStepCommonDefinition,
} from '../../common/step_types/read_trace_transcripts';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { readTraceTranscripts } from '../dreaming/trace_rounds';
import type { DreamingStepDependencies } from './helpers';

const MINUTE_MS = 60 * 1000;

/**
 * Reads the rounds the trace sources of an AI index found as transcripts. The traces are read as
 * the workflow user, so the run sees only the traces its user may read.
 */
export const getReadTraceTranscriptsStepDefinition = (
  {
    getAiIndexService,
    isContextEngineEnabled,
    isMemoryEnabled,
    checkReadPrivilege,
  }: DreamingStepDependencies,
  { getCurrentDate = () => new Date() }: { getCurrentDate?: () => Date } = {}
) =>
  createServerStepDefinition({
    ...readTraceTranscriptsStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const {
        ai_index_id: aiIndexId,
        since,
        after,
        size = DEFAULT_TRACE_TRANSCRIPTS_READ_SIZE,
        settle_minutes: settleMinutes = DEFAULT_TRACE_SETTLE_MINUTES,
      } = context.input;
      if (!(await checkReadPrivilege(context.contextManager.getFakeRequest(), spaceId))) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to read AI indices',
        });
      }
      const empty = { memories: [], resume_from: since, sources: [], skipped: 0 };
      if (!(await isContextEngineEnabled(spaceId)) || !(await isMemoryEnabled())) {
        return { output: empty };
      }

      let aiIndex: AiIndexHttpItem;
      try {
        aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
      } catch (error) {
        if (error instanceof AiIndexNotFoundError) {
          throw new ExecutionError({
            type: 'NotFoundError',
            message: `AI index '${aiIndexId}' not found`,
          });
        }
        throw error;
      }
      if (aiIndex.traces.length === 0) {
        return { output: empty };
      }

      const until = new Date(getCurrentDate().getTime() - settleMinutes * MINUTE_MS).toISOString();
      const output = await readTraceTranscripts({
        esClient: context.contextManager.getScopedEsClient(),
        traces: aiIndex.traces,
        spaceId,
        since,
        ...(after ? { after } : {}),
        until,
        size,
      });
      return { output };
    },
  });
