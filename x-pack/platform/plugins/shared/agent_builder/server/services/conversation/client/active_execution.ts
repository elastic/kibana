/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveExecution } from '@kbn/agent-builder-common';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecutionClient, ExecutionPeek } from '../../execution/persistence';
import {
  FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS,
  FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS,
} from '../../execution/constants';
import type { Document } from './converters';
import type {
  AcquireActiveExecution,
  ActiveExecutionUpdate,
  ConversationUpdatableFields,
  NormalizedConversation,
  ReleaseActiveExecution,
} from './types';

/**
 * Thrown from inside an OCC `fields` callback when another execution is active. The busy error
 * itself carries a 409, which `OccWriter` would mistake for a version conflict and retry.
 */
export class ConversationBusySignal {
  constructor(public readonly activeExecutionId: string) {}
}

export const isAcquireActiveExecution = (
  update?: ActiveExecutionUpdate
): update is AcquireActiveExecution => update?.action === 'acquire';

export const isReleaseActiveExecution = (
  update?: ActiveExecutionUpdate
): update is ReleaseActiveExecution => update?.action === 'release';

export const toActiveExecution = ({ executionId }: AcquireActiveExecution): ActiveExecution => ({
  execution_id: executionId,
});

/** True when `update` would leave the stored active execution as it is, including no update. */
export const isActiveExecutionUpdateNoop = (
  current: NormalizedConversation,
  update?: ActiveExecutionUpdate
): boolean =>
  !update ||
  (isReleaseActiveExecution(update) &&
    current.active_execution?.execution_id !== update.executionId);

export const readHeldExecution = async ({
  document,
  update,
  executionClient,
}: {
  document: Document;
  update?: ActiveExecutionUpdate;
  executionClient: AgentExecutionClient;
}): Promise<ExecutionPeek | undefined> => {
  const heldExecutionId = document._source?.active_execution?.execution_id;

  if (
    !isAcquireActiveExecution(update) ||
    !heldExecutionId ||
    heldExecutionId === update.executionId
  ) {
    return undefined;
  }

  return executionClient.peek(heldExecutionId);
};

/** True when an execution's record is gone, it finished, or its heartbeat went quiet. */
export const isExecutionStale = (execution?: ExecutionPeek, now = Date.now()): boolean => {
  if (!execution) {
    return true;
  }

  const { status, lastHeartbeat } = execution;

  if (status !== ExecutionStatus.scheduled && status !== ExecutionStatus.running) {
    return true;
  }

  const timeoutMs =
    status === ExecutionStatus.scheduled
      ? FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS
      : FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS;

  return !lastHeartbeat || now - Date.parse(lastHeartbeat) > timeoutMs;
};

/**
 * Acquires or releases the active execution. Acquiring refuses while another live execution holds
 * the conversation; releasing leaves a newer active execution alone.
 */
export const applyActiveExecutionUpdate = (
  current: NormalizedConversation,
  update: ActiveExecutionUpdate
): Pick<ConversationUpdatableFields, 'active_execution'> => {
  if (isReleaseActiveExecution(update)) {
    return isActiveExecutionUpdateNoop(current, update) ? {} : { active_execution: undefined };
  }

  const { active_execution: held, execution } = current;

  if (held && held.execution_id !== update.executionId && !isExecutionStale(execution)) {
    throw new ConversationBusySignal(held.execution_id);
  }

  return { active_execution: toActiveExecution(update) };
};
