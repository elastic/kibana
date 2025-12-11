/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, RawRoundInput } from '@kbn/onechat-common';
import { ConversationRoundStatus } from '@kbn/onechat-common';

const preflightChecks = ({
  input,
  conversation,
}: {
  input: RawRoundInput;
  conversation?: Conversation;
}) => {
  if (conversation) {
    const status = conversation.rounds[conversation.rounds.length - 1].status;
    if (status === ConversationRoundStatus.interruptionPending) {
      if (!hasInterruptInput(input)) {
        // TODO: throw error
      }
    } else {
      if (!hasStandardInput(input)) {
        // TODO: throw error
      }
    }
  } else {
    if (!hasStandardInput(input)) {
      // TODO: throw error
    }
  }
};

const hasStandardInput = (input: RawRoundInput): boolean => {
  return input.message !== undefined || (input.attachments?.length ?? 0) > 0;
};

const hasInterruptInput = (input: RawRoundInput): boolean => {
  return input.interrupt_response !== undefined && Object.keys(input.interrupt_response).length > 0;
};
