/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, shareReplay } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ConverseInput,
  Conversation,
  ChatAgentEvent,
  AgentCapabilities,
  AgentConfigurationOverrides,
  ConversationAction,
  AgentExecutionMode,
} from '@kbn/agent-builder-common';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { RunAgentFn } from '@kbn/agent-builder-server';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';

export const executeAgent$ = ({
  agentId,
  executionId,
  request,
  capabilities,
  structuredOutput,
  outputSchema,
  runAgent,
  conversation,
  nextInput,
  origin,
  abortSignal,
  defaultConnectorId,
  telemetryMetadata,
  maxContentLength,
  browserApiTools,
  configurationOverrides,
  action,
  executionMode,
}: {
  agentId: string;
  executionId: string;
  request: KibanaRequest;
  capabilities?: AgentCapabilities;
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown>;
  runAgent: RunAgentFn;
  conversation?: Conversation;
  nextInput: ConverseInput;
  origin?: ExecutionConversationOrigin;
  abortSignal?: AbortSignal;
  defaultConnectorId?: string;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  maxContentLength?: number;
  browserApiTools?: BrowserApiToolMetadata[];
  configurationOverrides?: AgentConfigurationOverrides;
  action?: ConversationAction;
  executionMode?: AgentExecutionMode;
}): Observable<ChatAgentEvent> => {
  return new Observable<ChatAgentEvent>((observer) => {
    runAgent({
      request,
      agentId,
      executionId,
      abortSignal,
      defaultConnectorId,
      telemetryMetadata,
      maxContentLength,
      executionMode,
      agentParams: {
        nextInput,
        conversation,
        origin,
        capabilities,
        browserApiTools,
        configurationOverrides,
        structuredOutput,
        outputSchema,
        action,
        executionId,
      },
      onEvent: (event) => {
        observer.next(event);
      },
    }).then(
      () => {
        observer.complete();
      },
      (err) => {
        observer.error(err);
      }
    );

    return () => {};
  }).pipe(shareReplay());
};
