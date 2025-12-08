/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentParams } from '@kbn/onechat-server/agents/provider';

export interface AgentExecution {
  executionId: string;
  agentId: string;
  conversationId?: string;
  spaceId: string;
  agentParams: AgentParams; // TODO: conversationId in there
  defaultConnectorId?: string;
  // TODO: browserApiTools?
}

export interface AgentExecutionEvent {
  '@timestamp': string;
  agentId: string;
  executionId: string;
  spaceId: string;
  event: Record<string, unknown>;
}
