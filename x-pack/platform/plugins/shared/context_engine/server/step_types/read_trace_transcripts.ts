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
  DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS,
  DEFAULT_TRACE_TRANSCRIPTS_READ_SIZE,
  DEFAULT_TRACE_TRANSCRIPTS_READ_TOKENS,
  MAX_TRACE_TRANSCRIPTS_BATCHES,
  MAX_WORKFLOW_STEP_OUTPUT_BYTES,
  loadTraceTranscriptsStepCommonDefinition,
  readTraceTranscriptsStepCommonDefinition,
  validateTraceTranscriptsBudget,
} from '../../common/step_types/read_trace_transcripts';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { TRACE_ROUND_ID_PREFIX } from '../dreaming/ids';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { batchByConversation, refsOfBatches, splitRound } from '../dreaming/trace_batches';
import {
  loadTraceTranscripts,
  readTraceTranscripts,
  targetOfTraceQuery,
} from '../dreaming/trace_rounds';
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
        max_tokens: maxTokens = DEFAULT_TRACE_TRANSCRIPTS_READ_TOKENS,
        batch_tokens: batchTokens = DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS,
        settle_minutes: settleMinutes = DEFAULT_TRACE_SETTLE_MINUTES,
      } = context.input;
      if (!(await checkReadPrivilege(context.contextManager.getFakeRequest(), spaceId))) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to read AI indices',
        });
      }
      const budgetError = validateTraceTranscriptsBudget({ maxTokens, batchTokens });
      if (budgetError !== undefined) {
        throw new ExecutionError({ type: 'ValidationError', message: budgetError });
      }
      const empty = { rounds: 0, batches: [], resume_from: since, sources: [], skipped: 0 };
      if (!(await isContextEngineEnabled(spaceId)) || !(await isMemoryEnabled())) {
        return { output: empty };
      }

      let aiIndex: AiIndexItem;
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
      const { memories, found, ...read } = await readTraceTranscripts({
        esClient: context.contextManager.getScopedEsClient(),
        traces: aiIndex.traces,
        spaceId,
        since,
        ...(after ? { after } : {}),
        until,
        size,
        maxTokens,
      });

      const batchesOf = (count: number) =>
        batchByConversation(memories.slice(0, count), batchTokens);
      let kept = memories.length;
      let batches = batchesOf(kept);
      if (batches.length > MAX_TRACE_TRANSCRIPTS_BATCHES) {
        let low = 1;
        let high = kept - 1;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (batchesOf(middle).length <= MAX_TRACE_TRANSCRIPTS_BATCHES) {
            low = middle;
          } else {
            high = middle - 1;
          }
        }
        kept = low;
        batches = batchesOf(kept);
      }
      const last = found[kept - 1];
      const resume =
        kept < memories.length && last
          ? { resume_from: last.lastAt, resume_after: last.traceId }
          : {
              resume_from: read.resume_from,
              ...(read.resume_after !== undefined && { resume_after: read.resume_after }),
            };
      const output = {
        ...read,
        ...resume,
        rounds: kept,
        batches: refsOfBatches(batches, found.slice(0, kept)),
      };
      if (JSON.stringify(output).length > MAX_WORKFLOW_STEP_OUTPUT_BYTES) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: 'The batches are too large for a step output: lower size.',
        });
      }
      return { output };
    },
  });

/**
 * Loads the transcripts of the rounds of one batch, from the references `readTraceTranscripts`
 * returned. Only rounds of the AI index's own trace sources are read, as the workflow user.
 */
export const getLoadTraceTranscriptsStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  isMemoryEnabled,
  checkReadPrivilege,
}: DreamingStepDependencies) =>
  createServerStepDefinition({
    ...loadTraceTranscriptsStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const {
        ai_index_id: aiIndexId,
        rounds,
        batch_tokens: batchTokens = DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS,
      } = context.input;
      if (!(await checkReadPrivilege(context.contextManager.getFakeRequest(), spaceId))) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to read AI indices',
        });
      }
      if (!(await isContextEngineEnabled(spaceId)) || !(await isMemoryEnabled())) {
        return { output: { memories: [] } };
      }

      let aiIndex: AiIndexItem;
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
      const targets = new Set(
        aiIndex.traces.flatMap(({ query }) => {
          try {
            return [targetOfTraceQuery(query)];
          } catch (error) {
            return [];
          }
        })
      );
      const foreign = rounds.find(({ target }) => !targets.has(target));
      if (foreign) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `'${foreign.target}' is not a trace source of AI index '${aiIndexId}'`,
        });
      }

      const loaded = await loadTraceTranscripts({
        esClient: context.contextManager.getScopedEsClient(),
        spaceId,
        rounds: rounds.map(({ trace_id: traceId, last_at: lastAt, target }) => ({
          traceId,
          lastAt,
          target,
        })),
      });
      const byId = new Map(loaded.map((memory) => [memory.id, memory]));
      const memories = rounds.flatMap(({ trace_id: traceId, parts }) => {
        const memory = byId.get(`${TRACE_ROUND_ID_PREFIX}${traceId}`);
        if (!memory) {
          return [];
        }
        const split = splitRound(memory, batchTokens);
        return parts ? split.slice(parts.from, parts.to) : split;
      });
      return { output: { memories } };
    },
  });
