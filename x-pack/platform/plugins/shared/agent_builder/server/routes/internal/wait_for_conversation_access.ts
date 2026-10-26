/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, createConversationNotFoundError } from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ConversationClient } from '../../services/conversation/client';
import {
  FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS,
  FOLLOW_POLL_INTERVAL_MS,
} from '../../services/execution/constants';

const isPendingStatus = (status: ExecutionStatus | undefined): boolean =>
  status === ExecutionStatus.scheduled || status === ExecutionStatus.running;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Resolves once the current user may converse in the conversation of an execution. A new
 * conversation is only persisted once its execution starts running, so this waits for it to be
 * created while the execution is pending.
 *
 * @param signal - Stops the wait when aborted.
 * @param timeoutMs - How long to wait for the conversation to be created.
 * @param pollIntervalMs - Delay between two checks for the conversation.
 * @throws {AgentBuilderConversationNotFoundError} when the conversation is not created before the
 * execution stops being pending, `timeoutMs` elapses or `signal` aborts, and when the user may not
 * converse in it.
 */
export const waitForConversationAccess = async ({
  conversationClient,
  conversationId,
  executionService,
  executionId,
  signal,
  timeoutMs = FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS,
  pollIntervalMs = FOLLOW_POLL_INTERVAL_MS,
}: {
  conversationClient: Pick<ConversationClient, 'exists' | 'get'>;
  conversationId: string;
  executionService: Pick<AgentExecutionService, 'getExecution'>;
  executionId: string;
  signal: AbortSignal;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!(await conversationClient.exists(conversationId))) {
    if (signal.aborted || Date.now() >= deadline) {
      throw createConversationNotFoundError({ conversationId });
    }
    const execution = await executionService.getExecution(executionId);
    if (!isPendingStatus(execution?.status)) {
      // The execution may have created the conversation right before it stopped being pending.
      if (await conversationClient.exists(conversationId)) {
        break;
      }
      throw createConversationNotFoundError({ conversationId });
    }
    await delay(pollIntervalMs);
  }
  await conversationClient.get(conversationId);
};
