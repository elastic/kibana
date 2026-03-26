/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserMessageEvent } from '@kbn/agent-builder-common';
import type { AgentTriggerHook } from './types';

/**
 * Group conversation trigger hook: only triggers agent execution
 * when the last user message contains '@agent'.
 */
export const groupTriggerHook: AgentTriggerHook = async ({ newEvents }) => {
  // Find the last user message in the new events
  const lastUserMessage = [...newEvents].reverse().find(isUserMessageEvent);
  if (!lastUserMessage) {
    return { invoke: false };
  }

  const trigger = lastUserMessage.message.includes('@agent');
  return { invoke: trigger };
};
