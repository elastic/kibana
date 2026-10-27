/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveExecution } from '@kbn/agent-builder-common';
import type {
  ActiveExecutionUpdate,
  ConversationUpdatableFields,
  NormalizedConversation,
  SetActiveExecution,
} from './types';

/** How long an execution stays active before another execution may take over. */
const ACTIVE_EXECUTION_TTL_MS = 5 * 60 * 1000;

/**
 * Thrown from inside an OCC `fields` callback when another execution is active. The busy error
 * itself carries a 409, which `OccWriter` would mistake for a version conflict and retry.
 */
export class ConversationBusySignal {
  constructor(public readonly activeExecutionId: string) {}
}

/** The `active_execution` stored for `update`, stamped with the current time. */
export const toActiveExecution = ({
  executionId,
  triggerEventId,
}: SetActiveExecution): ActiveExecution => ({
  execution_id: executionId,
  trigger_event_id: triggerEventId,
  started_at: new Date().toISOString(),
});

/** True when `update` would leave the stored active execution as it is. */
export const isActiveExecutionUpdateNoop = (
  current: NormalizedConversation,
  update: ActiveExecutionUpdate
): boolean =>
  'releaseExecutionId' in update &&
  current.active_execution?.execution_id !== update.releaseExecutionId;

/**
 * Sets or releases the active execution. Setting refuses while another execution became active
 * within the TTL; releasing leaves a newer active execution alone.
 */
export const applyActiveExecutionUpdate = (
  current: NormalizedConversation,
  update: ActiveExecutionUpdate
): Pick<ConversationUpdatableFields, 'active_execution'> => {
  if ('releaseExecutionId' in update) {
    return isActiveExecutionUpdateNoop(current, update) ? {} : { active_execution: undefined };
  }

  const { active_execution: held } = current;

  if (
    held &&
    held.execution_id !== update.executionId &&
    Date.now() - Date.parse(held.started_at) < ACTIVE_EXECUTION_TTL_MS
  ) {
    throw new ConversationBusySignal(held.execution_id);
  }

  return { active_execution: toActiveExecution(update) };
};
