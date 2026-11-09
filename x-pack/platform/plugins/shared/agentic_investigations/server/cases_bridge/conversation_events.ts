/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBuilderPluginSetup,
  ConversationEventTypeDefinition,
} from '@kbn/agent-builder-server';
import { getEventActorDisplayName } from '@kbn/agent-builder-common';
import {
  INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE,
  investigationLinkedToCaseEventSchema,
} from '../../common/cases_bridge';

/**
 * Shown to the agent too, so an agent continuing the investigation knows a person opened a case
 * for it and that the case now decides when it closes.
 */
export const investigationLinkedToCaseEventType: ConversationEventTypeDefinition<
  typeof INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE,
  typeof investigationLinkedToCaseEventSchema
> = {
  type: INVESTIGATION_LINKED_TO_CASE_EVENT_TYPE,
  payloadSchema: investigationLinkedToCaseEventSchema,
  format: ({ data, actor }) => ({
    type: 'text',
    value:
      `${getEventActorDisplayName(actor) ?? 'A user'} ${
        data.opened_from_here ? 'opened the case' : 'linked this investigation to the case'
      } "${data.case_title}" (id ${data.case_id}). ` +
      'Closing that case closes this investigation. Keep working the investigation as usual; ' +
      'the case links to it and does not copy its evidence.',
  }),
};

export const registerCaseBridgeConversationEvents = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.conversationEvents.register(investigationLinkedToCaseEventType);
};
