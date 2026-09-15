/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';

/**
 * Returns true while this conversation is streaming
 */
export const useIsCurrentConversationStreaming = () => {
  const conversationId = useConversationId();
  const { activeStreams } = useStreamingContext();

  return Boolean(conversationId && activeStreams.has(conversationId));
};
