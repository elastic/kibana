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
import { useConversation, useAgentId } from '../../../hooks/use_conversation';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import {
  useStreamRecord,
  useConversationStreamService,
} from '../../../context/streaming/streaming_context';
import { buildSavedItems, buildLiveItems, assembleTimelineItems } from './to_timeline_items';
import { Timeline } from './timeline';

const PENDING_USER_MESSAGE_ID = 'pending::user_message';

/**
 * @todo: errors not handled yet. Probably should read the streaming context error state here
 */
export const TimelineConnector: React.FC = () => {
  const { conversation } = useConversation();
  const conversationStreamService = useConversationStreamService();
  const conversationId = conversation?.id;

  const agentId = useAgentId();
  const { agent } = useAgentBuilderAgentById(agentId);

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
  const conversationAttachments = conversation?.attachments;

  const savedItems = useMemo(() => buildSavedItems(persistedEvents ?? []), [persistedEvents]);
  const liveItems = useMemo(
    () => buildLiveItems({ pendingUserMessage, activeExecution }),
    [pendingUserMessage, activeExecution]
  );
  const items = useMemo(
    () => assembleTimelineItems(savedItems, liveItems),
    [savedItems, liveItems]
  );

  return <Timeline items={items} agent={agent} conversationAttachments={conversationAttachments} />;
};
