/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationMode } from '@kbn/agent-builder-common';
import type { AgentTriggerHook } from './types';
import { singleUserTriggerHook } from './single_user_hook';
import { groupTriggerHook } from './group_hook';

/**
 * Returns the appropriate trigger hook for a given conversation mode.
 */
export const getTriggerHookForMode = (mode: ConversationMode): AgentTriggerHook => {
  switch (mode) {
    case ConversationMode.group:
      return groupTriggerHook;
    case ConversationMode.user:
    default:
      return singleUserTriggerHook;
  }
};
