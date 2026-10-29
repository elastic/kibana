/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { AgentExecutionClient, ConversationExecutionPeek } from './persistence';
import { isExecutionStale } from '../conversation/client/active_execution';

type ExecutionOrder = Pick<ConversationExecutionPeek, 'executionId' | '@timestamp'>;

const isOrderedBefore = (execution: ExecutionOrder, other: ExecutionOrder): boolean =>
  execution['@timestamp'] < other['@timestamp'] ||
  (execution['@timestamp'] === other['@timestamp'] && execution.executionId < other.executionId);

/** The conversation's live executions, oldest first: the running one and those waiting their turn. */
export const findLiveExecutions = async ({
  executionClient,
  conversationId,
}: {
  executionClient: AgentExecutionClient;
  conversationId: string;
}): Promise<ConversationExecutionPeek[]> => {
  const now = Date.now();
  const executions = await executionClient.findLiveByConversation(conversationId);

  return executions.filter((execution) => !isExecutionStale(execution, now));
};

/** The conversation's executions waiting for their turn, oldest first. */
export const findQueuedExecutions = async (params: {
  executionClient: AgentExecutionClient;
  conversationId: string;
}): Promise<ConversationExecutionPeek[]> => {
  const executions = await findLiveExecutions(params);

  return executions.filter(({ status }) => status === ExecutionStatus.scheduled);
};

/** True when an older execution is still waiting for its turn on the conversation. */
export const hasExecutionQueuedAhead = async ({
  executionClient,
  conversationId,
  execution,
}: {
  executionClient: AgentExecutionClient;
  conversationId: string;
  execution: Pick<AgentExecution, 'executionId' | '@timestamp'>;
}): Promise<boolean> => {
  const queued = await findQueuedExecutions({ executionClient, conversationId });

  return queued.some(
    (other) => other.executionId !== execution.executionId && isOrderedBefore(other, execution)
  );
};
