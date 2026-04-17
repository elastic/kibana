/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ServiceIdentifier } from 'inversify';

export interface SlackEventsConfig {
  enabled: boolean;
  slackBotToken: string;
  slackSigningSecret: string;
}

export interface AgentExecuteParams {
  request: KibanaRequest;
  useTaskManager?: boolean;
  params: {
    agentId?: string;
    connectorId?: string;
    nextInput: { message?: string };
  };
}

export interface AgentExecuteResult {
  executionId: string;
  events$: Observable<{ type: string; data: Record<string, unknown> }>;
}

export interface AgentExecutionContract {
  executeAgent(params: AgentExecuteParams): Promise<AgentExecuteResult>;
}

export const SlackEventsConfigToken = Symbol.for(
  'alerting_v2.SlackEventsConfig'
) as ServiceIdentifier<SlackEventsConfig>;

export const AgentBuilderExecutionToken = Symbol.for(
  'alerting_v2.AgentBuilderExecution'
) as ServiceIdentifier<AgentExecutionContract | undefined>;
