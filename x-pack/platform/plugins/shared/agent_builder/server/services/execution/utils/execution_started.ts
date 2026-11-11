/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter, map } from 'rxjs';
import type {
  ChatAgentEvent,
  ChatEvent,
  Conversation,
  ExecutionStartedEvent,
} from '@kbn/agent-builder-common';
import { isEventsNativeVersion, isRoundStartedEvent } from '@kbn/agent-builder-common';
import {
  executionStartedEvent,
  nextResumeIndex,
  promptResponseEventId,
  resumeExecutionStartedEvent,
} from '../../conversation/client/rounds_to_events';

/**
 * Projects the persisted `execution_started` timeline event at execution start.
 */
export const executionStartedEvents$ = ({
  conversation,
  agentEvents$,
}: {
  conversation: Conversation;
  agentEvents$: Observable<ChatAgentEvent | ChatEvent>;
}): Observable<ChatEvent> => {
  return agentEvents$.pipe(
    filter(isRoundStartedEvent),
    map((event): ExecutionStartedEvent => {
      const resumed = event.data.resumed === true;
      // A resumed round keeps the pending round's id; `round_started.round_id` is the freshly
      // minted runner id, not what the persisted events use.
      const pendingRoundId = conversation.rounds[conversation.rounds.length - 1]?.id;
      const roundId = resumed && pendingRoundId ? pendingRoundId : event.data.round_id;

      // Events-native resume is the only path that appends a new execution (`exec_k`) triggered
      // by a `prompt_response`. Regenerate and legacy resume rewrite the round and keep index 0
      // with the `user_message` trigger, matching the rounds-path projection.
      if (resumed && isEventsNativeVersion(conversation.schema_version)) {
        const executionIndex = nextResumeIndex(conversation, roundId);
        return resumeExecutionStartedEvent({
          roundId,
          executionIndex,
          startedAt: event.data.started_at,
          triggerEventId: promptResponseEventId(roundId, executionIndex),
          conversation,
        }) as ExecutionStartedEvent;
      }

      return executionStartedEvent(
        { id: roundId, started_at: event.data.started_at },
        conversation
      ) as ExecutionStartedEvent;
    })
  );
};
