/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { AgentBuilderClient, ExperimentTask } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { POC_INDEX } from './constants';
import type { LongMemEvalExample, LongMemEvalHistory } from './dataset';
import { deletePocIndex, loadHistoryIntoPocIndex } from './index_store';
import type { ToolEvidenceSummary } from './tool_evidence';
import { summarizeToolEvidence } from './tool_evidence';

export interface LongMemEvalTaskOutput {
  /** Null whenever the task did not produce a judgeable answer. */
  finalResponse: string | null;
  taskStatus: 'ok' | 'error';
  errorCode?: 'index_load_failed' | 'agent_call_failed' | 'empty_answer' | 'unanswered_prompts';
  errorMessage?: string;
  traceId?: string;
  loadDurationMs?: number;
  answerDurationMs?: number;
  tokensUsed?: { prompt: number; completion: number; total: number; cached?: number };
  toolEvidence?: ToolEvidenceSummary;
}

const MAX_ERROR_MESSAGE_LENGTH = 500;

const boundedMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_MESSAGE_LENGTH);

/** Renders the POC answering prompt. Names the index only; no query, fields or tool choice. */
export const buildAgentPrompt = ({
  question,
  questionDate,
}: {
  question: string;
  questionDate: string;
}): string =>
  [
    `Current Date: ${questionDate}`,
    '',
    "Treat the Current Date above as today's date for this question. Do not use the system clock or ES|QL NOW() for relative dates.",
    '',
    `Our past conversations are stored in the Elasticsearch index \`${POC_INDEX}\`, one document per conversation session. Use your tools to find what is relevant, then answer. If the history does not contain the answer, say so.`,
    '',
    `Question: ${question}`,
  ].join('\n');

/**
 * Builds the per-example task: load the example's history into the POC index, ask the
 * default agent, and always delete the index afterwards. Agent failures become typed,
 * unjudgeable output; cleanup failures throw so the experiment cannot continue on stale data.
 */
export const createLongMemEvalTask = ({
  agentBuilderClient,
  agentId,
  esClient,
  histories,
  log,
}: {
  agentBuilderClient: Pick<AgentBuilderClient, 'converse'>;
  agentId: string;
  esClient: Client;
  histories: ReadonlyMap<string, LongMemEvalHistory>;
  log: ToolingLog;
}): ExperimentTask<LongMemEvalExample, LongMemEvalTaskOutput> => {
  return async ({ id, input }) => {
    const history = histories.get(id);
    if (!history) {
      throw new Error(`No history loaded for example ${id}.`);
    }

    let loadDurationMs: number;
    try {
      ({ durationMs: loadDurationMs } = await loadHistoryIntoPocIndex(esClient, history));
      log.info(`[${id}] indexed ${history.sessions.length} sessions in ${loadDurationMs}ms`);
    } catch (error) {
      await deletePocIndex(esClient);
      return {
        finalResponse: null,
        taskStatus: 'error',
        errorCode: 'index_load_failed',
        errorMessage: boundedMessage(error),
      };
    }

    try {
      const startedAt = Date.now();
      const response = await agentBuilderClient.converse({
        agentId,
        input: buildAgentPrompt(input),
      });
      const answerDurationMs = Date.now() - startedAt;
      const toolEvidence = summarizeToolEvidence(response.steps);
      const common = {
        traceId: response.traceId,
        loadDurationMs,
        answerDurationMs,
        tokensUsed: response.tokensUsed,
        toolEvidence,
      };

      if (response.prompts.length > 0) {
        return {
          ...common,
          finalResponse: null,
          taskStatus: 'error',
          errorCode: 'unanswered_prompts',
          errorMessage: `Agent asked ${response.prompts.length} prompt(s) instead of answering.`,
        };
      }
      if (response.message.trim().length === 0) {
        return { ...common, finalResponse: null, taskStatus: 'error', errorCode: 'empty_answer' };
      }
      return { ...common, finalResponse: response.message, taskStatus: 'ok' };
    } catch (error) {
      return {
        finalResponse: null,
        taskStatus: 'error',
        errorCode: 'agent_call_failed',
        errorMessage: boundedMessage(error),
        loadDurationMs,
      };
    } finally {
      await deletePocIndex(esClient);
    }
  };
};
