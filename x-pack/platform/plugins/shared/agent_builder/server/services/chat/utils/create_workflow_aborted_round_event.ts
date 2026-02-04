/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConverseInput, RoundInput } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationRoundStatus,
  type ConversationRound,
  type RoundCompleteEvent,
  type RoundModelUsageStats,
} from '@kbn/agent-builder-common';

/**
 * Builds a minimal RoundInput from ConverseInput for a synthetic aborted round.
 */
function toRoundInput(nextInput: ConverseInput): RoundInput {
  return {
    ...(nextInput.prompts ? { prompts: nextInput.prompts } : {}),
    message: nextInput.message ?? '',
  };
}

/**
 * Creates a synthetic round-complete event for when execution was aborted by a workflow.
 */
export const createWorkflowAbortedRoundCompleteEvent = ({
  nextInput,
  message,
  connectorId,
  workflowName,
  startTime = new Date(),
}: {
  nextInput: ConverseInput;
  message: string;
  connectorId: string;
  workflowName?: string;
  startTime?: Date;
}): RoundCompleteEvent => {
  const endTime = new Date();
  const elapsed = endTime.getTime() - startTime.getTime();

  const modelUsage: RoundModelUsageStats = {
    connector_id: connectorId,
    llm_calls: 0,
    input_tokens: 0,
    output_tokens: 0,
  };

  const responseMessage =
    workflowName !== undefined
      ? `Execution Aborted by Workflow "${workflowName}": ${message}`
      : message;

  const round: ConversationRound = {
    id: uuidv4(),
    status: ConversationRoundStatus.completed,
    input: toRoundInput(nextInput),
    steps: [],
    response: { message: responseMessage },
    started_at: startTime.toISOString(),
    time_to_first_token: 0,
    time_to_last_token: elapsed,
    model_usage: modelUsage,
  };

  return {
    type: ChatEventType.roundComplete,
    data: {
      round,
      resumed: false,
    },
  };
};
