/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';

interface ReleaseLocalContentParams {
  refetch: () => Promise<Conversation>;
  executionId?: string;
  triggerEventId?: string;
  clearPendingMessage?: () => void;
  clearExecution: (executionId: string) => void;
}

/**
 * Fetches saved history after an execution finished and drops the local copies whose saved
 * replacement is present, matched by server ids. A failed fetch is not an execution failure:
 * the pending message is cleared anyway, and the live events are left to the stream service.
 */
export const releaseLocalContent = async ({
  refetch,
  executionId,
  triggerEventId,
  clearPendingMessage,
  clearExecution,
}: ReleaseLocalContentParams): Promise<void> => {
  let conversation: Conversation;
  try {
    conversation = await refetch();
  } catch {
    clearPendingMessage?.();
    return;
  }

  const events = conversation.events ?? [];
  if (!triggerEventId || events.some((event) => event.id === triggerEventId)) {
    clearPendingMessage?.();
  }
  if (
    executionId &&
    events.some(
      (event) =>
        event.type === TimelineEventType.executionTerminated && event.execution_id === executionId
    )
  ) {
    clearExecution(executionId);
  }
};
