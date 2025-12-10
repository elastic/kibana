/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, RawRoundInput } from '@kbn/onechat-common';
import type { InterruptRequest } from '@kbn/onechat-common/chat/interruptions';
import type { ToolInterruptManager, InterruptManager } from '@kbn/onechat-server/runner';

export const createInterruptManager = (): InterruptManager => {
  const interruptMap = new Map<string, InterruptRequest>();

  return {
    set: (toolCallId, interrupt) => {
      interruptMap.set(toolCallId, interrupt);
    },
    clear: () => {
      interruptMap.clear();
    },
    forToolCallId: (toolCallId: string): ToolInterruptManager => {
      return {
        getCurrentInterrupt: () => {
          return interruptMap.get(toolCallId);
        },
      };
    },
  };
};

export const initInterruptManager = ({
  interruptManager,
  input,
  conversation,
}: {
  interruptManager: InterruptManager;
  input: RawRoundInput;
  conversation?: Conversation;
}) => {
  if (conversation) {
    const lastRound = conversation.rounds[conversation.rounds.length - 1];
    const interrupt = lastRound.current_interrupt;
  }
};
