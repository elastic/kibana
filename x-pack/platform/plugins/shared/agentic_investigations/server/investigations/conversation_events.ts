/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import {
  STATUS_CHANGED_EVENT_TYPE,
  statusChangedEventSchema,
} from '../../common/investigations/conversation_events';

/** Registers the status timeline event. UI-only: without a `format` it is never shown to the LLM. */
export const registerStatusConversationEvents = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.conversationEvents.register({
    type: STATUS_CHANGED_EVENT_TYPE,
    payloadSchema: statusChangedEventSchema,
  });
};
