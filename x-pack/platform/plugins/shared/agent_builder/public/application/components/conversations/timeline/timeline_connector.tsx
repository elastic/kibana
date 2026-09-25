/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useConversation, useAgentId } from '../../../hooks/use_conversation';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { TimelineScreenReaderStatus } from './screen_reader_status';
import { useTimelineItems } from './use_timeline_items';
import { Timeline } from './timeline';
import type { AgentTurnItem } from './types';

/**
 * @todo: errors not handled yet. Probably should read the streaming context error state here
 */
export const TimelineConnector: React.FC = () => {
  const { conversation } = useConversation();
  const agentId = useAgentId();
  const { agent } = useAgentBuilderAgentById(agentId);
  const items = useTimelineItems();
  const { isResuming, isStreaming } = useConversationStream();
  const lastTurn = items.filter((item): item is AgentTurnItem => item.kind === 'agentTurn').at(-1);

  return (
    <>
      <TimelineScreenReaderStatus responseMessage={lastTurn?.response?.message} />
      <Timeline
        items={items}
        agent={agent}
        conversationAttachments={conversation?.attachments}
        isResuming={isResuming}
        isStreaming={isStreaming}
      />
    </>
  );
};
