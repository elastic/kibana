/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import { ObservabilityAIAssistantTelemetryEventType } from '../telemetry_event_type';
import {
  type Connector,
  type Scope,
  connectorSchema,
  scopeSchema,
} from '../../../common/analytics';

export interface UserSentPrompt extends Connector, Scope {}

export const userSentPromptEventSchema: EventTypeOpts<UserSentPrompt> = {
  eventType: ObservabilityAIAssistantTelemetryEventType.UserSentPromptInChat,
  schema: {
    scopes: scopeSchema,
    connector: {
      properties: connectorSchema,
    },
  },
};
