/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { TimelineEventType, EventActorType } from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';
import { useConversation } from '../../../hooks/use_conversation';
import {
  useStreamRecord,
  useConversationStreamService,
} from '../../../context/streaming/streaming_context';
import { toTimelineItems } from './group_timeline_events';
import { Timeline } from './timeline';

const PENDING_USER_MESSAGE_ID = 'pending::user_message';

/**
 * @todo: errors not handled yet. Probably should read the streaming context error state here
 */
export const TimelineConnector: React.FC = () => {
  const { conversation } = useConversation();
  const conversationStreamService = useConversationStreamService();
  const conversationId = conversation?.id;

  const activeStream$: Observable<ActiveExecutionDraft | null> = useMemo(
    () => (conversationId ? conversationStreamService.getActiveStream$(conversationId) : of(null)),
    [conversationStreamService, conversationId]
  );
  const activeExecution = useObservable(activeStream$, null);

  const { pendingMessage } = useStreamRecord(conversationId);
  const pendingUserMessage = useMemo<UserMessageEvent | null>(
    () =>
      pendingMessage
        ? {
            id: PENDING_USER_MESSAGE_ID,
            type: TimelineEventType.userMessage,
            created_at: new Date().toISOString(),
            actor: { type: EventActorType.user, id: '' },
            data: { message: pendingMessage },
          }
        : null,
    [pendingMessage]
  );

  const persistedEvents = conversation?.events;

  const items = useMemo(
    () =>
      toTimelineItems({
        events: persistedEvents ?? [],
        pendingUserMessage,
        activeExecution,
      }),
    [persistedEvents, pendingUserMessage, activeExecution]
  );

  return <Timeline items={items} />;
};
