/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema, EventTypeOpts } from '@kbn/core/server';
import { type Connector, type Scope, connectorSchema, scopeSchema } from '../../common/analytics';

export interface ToolCallEvent extends Connector, Scope {
  toolName: string;
}

const schema: RootSchema<ToolCallEvent> = {
  toolName: {
    type: 'text',
    _meta: {
      description: 'The name of the tool that was called',
    },
  },
  connector: {
    properties: connectorSchema,
  },
  scopes: scopeSchema,
};

export const toolCallEventType = 'observability_ai_assistant_tool_call';

export const toolCallEvent: EventTypeOpts<ToolCallEvent> = {
  eventType: toolCallEventType,
  schema,
};
