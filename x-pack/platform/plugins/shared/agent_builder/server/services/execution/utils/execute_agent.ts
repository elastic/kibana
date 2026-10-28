/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '@kbn/agent-builder-common';
import { Observable, shareReplay } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ConverseInput,
  Conversation,
  ChatAgentEvent,
  AgentConfigurationOverrides,
  AgentExecutionMode,
  ConversationRoundAuthor,
  InteractivityConfigInput,
} from '@kbn/agent-builder-common';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { ExecutionConversationAccess, RunAgentFn } from '@kbn/agent-builder-server';
import type {
  ExecutionConversationOrigin,
  ExecutionRunAs,
} from '@kbn/agent-builder-server/execution';
import type {
  ChatCompletionReasoningEffort,
  ConnectorTelemetryMetadata,
} from '@kbn/inference-common';

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
  owner,
  runAs,
  abortSignal,
  defaultConnectorId,
  telemetryMetadata,
  maxContentLength,
  reasoningLevel,
  browserApiTools,
  configurationOverrides,
  executionMode,
  interactivity,
  parentExecutionId,
  projectRouting,
  roundId,
  conversationAccess,
  workflowExecutionId,
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
  /** Identity conversation writes are attributed to; see {@link RunAgentParams.owner}. */
  owner?: UserIdAndName;
  /** Service account the execution runs as; see {@link RunAgentParams.runAs}. */
  runAs?: ExecutionRunAs;
  abortSignal?: AbortSignal;
  defaultConnectorId?: string;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  maxContentLength?: number;
  reasoningLevel?: ChatCompletionReasoningEffort;
  browserApiTools?: BrowserApiToolMetadata[];
  configurationOverrides?: AgentConfigurationOverrides;
  executionMode?: AgentExecutionMode;
  interactivity?: InteractivityConfigInput;
  parentExecutionId?: string;
  projectRouting?: string;
  roundId?: string;
  conversationAccess?: ExecutionConversationAccess;
  workflowExecutionId?: string;
}): Observable<ChatAgentEvent> => {
  return new Observable<ChatAgentEvent>((observer) => {
    runAgent({
      request,
      agentId,
      executionId,
      owner,
      runAs,
      abortSignal,
      defaultConnectorId,
      telemetryMetadata,
      maxContentLength,
      reasoningLevel,
      executionMode,
      interactive: interactivity,
      parentExecutionId,
      projectRouting,
      conversationAccess,
      workflowExecutionId,
      agentParams: {
        nextInput,
        conversation,
        origin,
        author,
        browserApiTools,
        configurationOverrides,
        structuredOutput,
        outputSchema,
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
