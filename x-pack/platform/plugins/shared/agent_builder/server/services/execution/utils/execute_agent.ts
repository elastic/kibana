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
  AgentConfigurationOverrides,
  ConversationAction,
  AgentExecutionMode,
  ConversationRoundAuthor,
  InteractivityConfigInput,
} from '@kbn/agent-builder-common';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { RunAgentFn } from '@kbn/agent-builder-server';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';

export const executeAgent$ = ({
  agentId,
  executionId,
  request,
  structuredOutput,
  outputSchema,
  runAgent,
  conversation,
  nextInput,
  origin,
  author,
  abortSignal,
  defaultConnectorId,
  telemetryMetadata,
  maxContentLength,
  browserApiTools,
  configurationOverrides,
  action,
  executionMode,
  interactivity,
  parentExecutionId,
  projectRouting,
  roundId,
}: {
  agentId: string;
  executionId: string;
  request: KibanaRequest;
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown>;
  runAgent: RunAgentFn;
  conversation?: Conversation;
  nextInput: ConverseInput;
  origin?: ExecutionConversationOrigin;
  author?: ConversationRoundAuthor;
  abortSignal?: AbortSignal;
  defaultConnectorId?: string;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  maxContentLength?: number;
  browserApiTools?: BrowserApiToolMetadata[];
  configurationOverrides?: AgentConfigurationOverrides;
  action?: ConversationAction;
  executionMode?: AgentExecutionMode;
  interactivity?: InteractivityConfigInput;
  parentExecutionId?: string;
  projectRouting?: string;
  roundId?: string;
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
      interactive: interactivity,
      parentExecutionId,
      projectRouting,
      agentParams: {
        nextInput,
        conversation,
        origin,
        author,
        browserApiTools,
        configurationOverrides,
        structuredOutput,
        outputSchema,
        action,
        executionId,
        roundId,
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
