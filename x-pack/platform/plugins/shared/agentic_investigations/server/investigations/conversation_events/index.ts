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
  INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  investigationSeverityChangedEventSchema,
} from '../../../common/investigations/severity_change';
import {
  INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  investigationRunFailedEventSchema,
} from '../../../common/investigations/run_failure';

/**
 * Shown to the agent as well as the user, so an agent continuing the investigation knows the
 * severity is a human's call rather than its own earlier rating.
 */
export const investigationSeverityChangedEventType: ConversationEventTypeDefinition<
  typeof INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  typeof investigationSeverityChangedEventSchema
> = {
  type: INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  payloadSchema: investigationSeverityChangedEventSchema,
  format: ({ data, actor }) => ({
    type: 'text',
    value:
      `${
        getEventActorDisplayName(actor) ?? 'A user'
      } (a human) changed the investigation severity ` +
      `${data.previous_severity ? `from "${data.previous_severity}" ` : ''}to "${
        data.severity
      }". ` +
      'Treat this as the authoritative severity: do not set a different one unless new findings ' +
      'clearly contradict it, and then say why in your answer.',
  }),
};

export const investigationRunFailedEventType: ConversationEventTypeDefinition<
  typeof INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  typeof investigationRunFailedEventSchema
> = {
  type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  payloadSchema: investigationRunFailedEventSchema,
  format: ({ data }) => ({
    type: 'text',
    value: [
      `A previous investigation workflow run (${data.execution_id}) failed. This is a historical failure report, not a successful investigation result.`,
      data.request ? `Original request:\n${data.request}` : 'Original request unavailable.',
      `Failure reason:\n${data.reason}`,
    ].join('\n\n'),
  }),
};

export const registerInvestigationConversationEvents = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.conversationEvents.register(investigationSeverityChangedEventType);
  agentBuilder.conversationEvents.register(investigationRunFailedEventType);
};
