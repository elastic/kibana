/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationDisplayStatus, ConversationRoundStatus } from '@kbn/agent-builder-common';

export const deriveDisplayStatus = (
  conversation: { read?: boolean; status?: ConversationRoundStatus },
  isStreaming: boolean,
  hasError: boolean,
  isActive: boolean
): ConversationDisplayStatus | undefined => {
  if (isStreaming || conversation.status === ConversationRoundStatus.inProgress) {
    return ConversationDisplayStatus.inProgress;
  }
  if (hasError) {
    return ConversationDisplayStatus.error;
  }
  if (conversation.status === ConversationRoundStatus.awaitingPrompt) {
    return ConversationDisplayStatus.awaitingPrompt;
  }
  if (conversation.read === false && !isActive) {
    return ConversationDisplayStatus.unread;
  }
  return undefined;
};
