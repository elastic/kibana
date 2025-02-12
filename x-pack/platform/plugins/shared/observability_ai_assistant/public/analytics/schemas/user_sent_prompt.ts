/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import { AssistantScope } from '@kbn/ai-assistant-common';
import { ObservabilityAIAssistantTelemetryEventType } from '../telemetry_event_type';

export interface UserSentPrompt {
  scopes: AssistantScope[];
}

export const userSentPromptEventSchema: EventTypeOpts<UserSentPrompt> = {
  eventType: ObservabilityAIAssistantTelemetryEventType.UserSentPromptInChat,
  schema: {
    scopes: {
      type: 'array',
      items: {
        type: 'text',
        _meta: { description: 'Scope of the AI Assistant' },
      },
    },
  },
};
