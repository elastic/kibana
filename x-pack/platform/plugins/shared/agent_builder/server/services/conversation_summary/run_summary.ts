/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  createNonInteractiveConfig,
  isMessageCompleteEvent,
  AgentExecutionMode,
} from '@kbn/agent-builder-common';
import type { ExecuteAgentParams, ExecuteAgentResult } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import { filter, lastValueFrom } from 'rxjs';

const SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary'],
  properties: {
    summary: { type: 'string' },
  },
};

export interface ConversationSummaryRunnerDeps {
  executeAgent: (params: ExecuteAgentParams) => Promise<ExecuteAgentResult>;
  patchSummary: (params: {
    request: KibanaRequest;
    conversationId: string;
    field: string;
    summary: string;
  }) => Promise<void>;
}

export interface ConversationSummaryTaskParams {
  conversationId: string;
  templateId?: string;
  skillId: string;
  field: string;
}

const readSummary = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object' || !('summary' in value)) {
    return undefined;
  }
  const summary = (value as { summary?: unknown }).summary;
  return typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : undefined;
};

/**
 * Runs the template skill beside the conversation and writes the summary onto its metadata.
 * The agent execution is standalone, so the investigation transcript does not gain a chat round.
 */
export const runConversationSummary = async ({
  request,
  task,
  deps,
}: {
  request: KibanaRequest;
  task: ConversationSummaryTaskParams;
  deps: ConversationSummaryRunnerDeps;
}): Promise<void> => {
  const { events$ } = await deps.executeAgent({
    request,
    mode: AgentExecutionMode.standalone,
    useTaskManager: false,
    interactive: createNonInteractiveConfig(),
    params: {
      agentId: agentBuilderDefaultAgentId,
      structuredOutput: true,
      outputSchema: SUMMARY_SCHEMA,
      nextInput: {
        message: [
          `Use the [/${task.skillId}](skill://${task.skillId}) skill.`,
          `Conversation id: ${task.conversationId}`,
          `Template: ${task.templateId ?? 'unknown'}`,
          'Read that conversation before you summarize. Return only the structured summary.',
        ].join('\n'),
      },
    },
  });

  const completed = await lastValueFrom(events$.pipe(filter(isMessageCompleteEvent)), {
    defaultValue: undefined,
  });
  const summary = readSummary(completed?.data.structured_output);
  if (!summary) {
    return;
  }

  await deps.patchSummary({
    request,
    conversationId: task.conversationId,
    field: task.field,
    summary,
  });
};
