/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserMessageEvent, isAgentResponseEvent } from '@kbn/agent-builder-common';
import type { AgentTriggerHook } from './types';

/**
 * Group conversation trigger hook:
 * - Always triggers on the first message (no prior agent response in conversation)
 * - Otherwise triggers only when the last user message contains '@agent'
 */
export const groupTriggerHook: AgentTriggerHook = async ({ conversation, newEvents }) => {
  // Always trigger if this is the first message (no prior agent response)
  const hasAgentResponse = conversation.timeline.some(isAgentResponseEvent);
  if (!hasAgentResponse) {
    return { invoke: true };
  }

  // Otherwise, trigger only on @agent mention
  const lastUserMessage = [...newEvents].reverse().find(isUserMessageEvent);
  if (!lastUserMessage) {
    return { invoke: false };
  }

  return { invoke: lastUserMessage.message.includes('@agent') };
};
