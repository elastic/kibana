/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, of, filter, EMPTY } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  ChatEvent,
  ConverseInput,
  AgentCapabilities,
  AgentConfigurationOverrides,
  BrowserApiToolMetadata,
} from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  isRoundCompleteEvent,
  isAgentBuilderError,
  AgentBuilderErrorCode,
} from '@kbn/agent-builder-common';
import { getConnectorProvider } from '@kbn/inference-common';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ConversationService, ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  generateTitle,
  handleCancellation,
  executeAgent$,
  getConversation,
  updateConversation$,
  createConversation$,
  resolveServices,
  convertErrors,
  type ConversationWithOperation,
} from '../chat/utils';
import { createConversationIdSetEvent } from '../chat/utils/events';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import type { AgentExecution, AgentExecutionEventDoc, SerializedExecutionError } from './types';
import type { ExecutionEventsClient } from './persistence';

const EVENT_BATCH_INTERVAL_MS = 200;

/**
 * Dependencies needed to build and run an agent event stream.
 * Shared between the Task Manager handler and the local execution path.
 */
export interface AgentExecutionDeps {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  spaces?: SpacesPluginStart;
  trackingService?: TrackingService;
  analyticsService?: AnalyticsService;
}

/**
 * Resolves services, gets the conversation, and builds the full agent event stream.
 * This is the core execution logic shared between local and TM execution.
 *
 * @returns An observable of ChatEvents (agent events + persistence events).
 */
export const handleAgentExecution = async ({
  execution,
  deps,
  request,
  abortSignal,
}: {
  execution: AgentExecution;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  abortSignal: AbortSignal;
}): Promise<Observable<ChatEvent>> => {
  const {
    agentId = agentBuilderDefaultAgentId,
    connectorId,
    conversationId,
    capabilities,
    structuredOutput,
    outputSchema,
    storeConversation = true,
    autoCreateConversationWithId = false,
    nextInput,
    browserApiTools,
    configurationOverrides,
  } = execution.agentParams;

  const { logger, trackingService, analyticsService } = deps;

  // Resolve scoped services
  const services = await resolveServices({
    agentId,
    connectorId,
    request,
    ...deps,
  });

  // Get conversation
  const conversation = await getConversation({
    agentId,
    conversationId,
    autoCreateConversationWithId,
    conversationClient: services.conversationClient,
  });

  // Build the event stream
  return executeAgent({
    agentId,
    request,
    nextInput,
    capabilities,
    structuredOutput,
    outputSchema,
    storeConversation,
    abortSignal,
    conversation,
    conversationId,
    conversationClient: services.conversationClient,
    chatModel: services.chatModel,
    selectedConnectorId: services.selectedConnectorId,
    browserApiTools,
    configurationOverrides,
    agentService: deps.agentService,
    logger,
    trackingService,
    analyticsService,
  });
};

/**
 * Subscribe to the event stream and write events to the data stream with 200ms batching.
 * Returns a promise that resolves when the observable completes and all events are flushed.
 */
export const collectAndWriteEvents = ({
  events$,
  execution,
  eventsClient,
  logger,
}: {
  events$: Observable<ChatEvent>;
  execution: AgentExecution;
  eventsClient: ExecutionEventsClient;
  logger: Logger;
}): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    let eventNumber = 0;
    let pendingEvents: AgentExecutionEventDoc[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let flushInProgress: Promise<void> | undefined;

    const flush = async () => {
      if (pendingEvents.length === 0) {
        return;
      }
      const batch = pendingEvents;
      pendingEvents = [];
      await eventsClient.writeEvents(batch);
    };

    const scheduleFlush = () => {
      if (flushTimer === undefined) {
        flushTimer = setTimeout(() => {
          flushTimer = undefined;
          flushInProgress = flush().catch((err) => {
            logger.error(
              `Failed to flush events for execution ${execution.executionId}: ${err.message}`
            );
          });
        }, EVENT_BATCH_INTERVAL_MS);
      }
    };

    const cleanup = () => {
      if (flushTimer !== undefined) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
    };

    events$.subscribe({
      next: (event) => {
        eventNumber += 1;
        pendingEvents.push({
          '@timestamp': Date.now(),
          agentExecutionId: execution.executionId,
          eventNumber,
          agentId: execution.agentId,
          spaceId: execution.spaceId,
          event,
        });
        scheduleFlush();
      },
      error: (err) => {
        cleanup();
        reject(err);
      },
      complete: () => {
        cleanup();
        const finalFlush = async () => {
          if (flushInProgress) {
            await flushInProgress;
          }
          await flush();
        };
        finalFlush().then(resolve, reject);
      },
    });
  });
};

/**
 * Converts an unknown error to a {@link SerializedExecutionError} for persistence.
 * - If the error is already an AgentBuilderError, serializes it using toJSON().
 * - Otherwise, wraps it as an internalError.
 */
export const serializeExecutionError = (error: unknown): SerializedExecutionError => {
  if (isAgentBuilderError(error)) {
    return { code: error.code as AgentBuilderErrorCode, message: error.message, meta: error.meta };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { code: AgentBuilderErrorCode.internalError, message };
};

// --- Internal helpers ---

const executeAgent = ({
  agentId,
  request,
  nextInput,
  capabilities,
  structuredOutput,
  outputSchema,
  storeConversation,
  abortSignal,
  conversation,
  conversationId,
  conversationClient,
  chatModel,
  selectedConnectorId,
  browserApiTools,
  configurationOverrides,
  agentService,
  logger,
  trackingService,
  analyticsService,
}: {
  agentId: string;
  request: KibanaRequest;
  nextInput: ConverseInput;
  capabilities?: AgentCapabilities;
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown>;
  storeConversation: boolean;
  abortSignal: AbortSignal;
  conversation: ConversationWithOperation;
  conversationId?: string;
  conversationClient: ConversationClient;
  chatModel: InferenceChatModel;
  selectedConnectorId: string;
  browserApiTools?: BrowserApiToolMetadata[];
  configurationOverrides?: AgentConfigurationOverrides;
  agentService: AgentsServiceStart;
  logger: Logger;
  trackingService?: TrackingService;
  analyticsService?: AnalyticsService;
}): Observable<ChatEvent> => {
  // Emit conversation ID for new conversations (only when persisting)
  const conversationIdEvent$ =
    storeConversation && conversation.operation === 'CREATE'
      ? of(createConversationIdSetEvent(conversation.id))
      : EMPTY;

  // Execute agent
  const agentEvents$ = executeAgent$({
    agentId,
    request,
    nextInput,
    capabilities,
    structuredOutput,
    outputSchema,
    abortSignal,
    conversation,
    defaultConnectorId: selectedConnectorId,
    agentService,
    browserApiTools,
    configurationOverrides,
  });

  // Generate title (for CREATE) or use existing title (for UPDATE)
  const title$ =
    conversation.operation === 'CREATE'
      ? generateTitle({
          chatModel,
          conversation,
          nextInput,
        })
      : of(conversation.title);

  // Persist conversation (optional)
  const persistenceEvents$ = storeConversation
    ? buildPersistenceEvents({
        agentId,
        conversation,
        conversationClient,
        conversationId,
        title$,
        agentEvents$,
      })
    : EMPTY;

  // Merge all event streams
  const effectiveConversationId =
    conversation.operation === 'CREATE' ? conversation.id : conversationId;
  const modelProvider = getConnectorProvider(chatModel.getConnector());

  return merge(conversationIdEvent$, agentEvents$, persistenceEvents$).pipe(
    handleCancellation(abortSignal),
    convertErrors({
      agentId,
      logger,
      analyticsService,
      trackingService,
      modelProvider,
      conversationId: effectiveConversationId,
    })
  );
};

const buildPersistenceEvents = ({
  agentId,
  conversation,
  conversationClient,
  conversationId,
  title$,
  agentEvents$,
}: {
  agentId: string;
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  conversationId?: string;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
}): Observable<ChatEvent> => {
  const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

  if (conversation.operation === 'CREATE') {
    return createConversation$({
      agentId,
      conversationClient,
      conversationId: conversationId || conversation.id,
      title$,
      roundCompletedEvents$,
    });
  }

  return updateConversation$({
    conversationClient,
    conversation,
    title$,
    roundCompletedEvents$,
  });
};
