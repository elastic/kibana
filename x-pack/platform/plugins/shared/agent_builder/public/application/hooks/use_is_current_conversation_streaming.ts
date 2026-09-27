/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';
import type { StreamType } from '../context/streaming/types';

/**
 * The kind of stream in flight for this conversation, or `undefined` when it is not streaming.
 * `send` is a new turn; `resume` continues a paused one after a HITL prompt.
 */
export const useCurrentConversationStreamType = (): StreamType | undefined => {
  const conversationId = useConversationId();
  const { activeStreams } = useStreamingContext();

  return conversationId ? activeStreams.get(conversationId)?.type : undefined;
};

/**
 * Returns true while this conversation is streaming
 */
export const useIsCurrentConversationStreaming = () => {
  return useCurrentConversationStreamType() !== undefined;
};
