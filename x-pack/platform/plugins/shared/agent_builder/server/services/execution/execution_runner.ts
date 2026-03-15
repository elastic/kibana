/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, of, filter, tap, EMPTY } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RunAgentFn } from '@kbn/agent-builder-server';
import type { ChatEvent, ConversationAction } from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  isRoundCompleteEvent,
  isAgentBuilderError,
  AgentBuilderErrorCode,
} from '@kbn/agent-builder-common';
import { getConnectorProvider } from '@kbn/inference-common';
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
} from './utils';
import { createConversationIdSetEvent } from './utils/events';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import { withConverseSpan } from '../../tracing';
import type { MeteringService } from '../metering';
import type { AgentExecution, SerializedExecutionError } from './types';
import type { AgentExecutionClient } from './persistence';

import { EVENT_BATCH_INTERVAL_MS } from './constants';

/**
 * Dependencies needed to build and run an agent event stream.
 * Shared between the Task Manager handler and the local execution path.
 */
export interface AgentExecutionDeps {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  runAgent: RunAgentFn;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  spaces?: SpacesPluginStart;
  meteringService: MeteringService;
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
    action,
  } = execution.agentParams;

  const { logger, runAgent, trackingService, analyticsService, meteringService } = deps;
  const anonymizationEnabled = deps.inference.isAnonymizationEnabled();

  // Resolve scoped services
  const { conversationClient, chatModel, selectedConnectorId } = await resolveServices({
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
    conversationClient,
    anonymizationEnabled,
  });

  // Emit conversation ID for new conversations (only when persisting)
  const conversationIdEvent$ =
    storeConversation && conversation.operation === 'CREATE'
      ? of(createConversationIdSetEvent(conversation.id))
      : EMPTY;

  // Execute agent
  const agentEvents$ = executeAgent$({
    agentId,
    executionId: execution.executionId,
    request,
    nextInput,
    capabilities,
    structuredOutput,
    outputSchema,
    abortSignal,
    conversation,
    defaultConnectorId: selectedConnectorId,
    runAgent,
    browserApiTools,
    configurationOverrides,
    action,
  });

  const deanonymizeTitle = createDeanonymizeTitleFn({
    anonymizationEnabled,
    conversation,
    deps,
    request,
    logger,
  });

  const title$ =
    conversation.operation === 'CREATE'
      ? generateTitle({
          chatModel,
          conversation,
          nextInput,
          anonymizationEnabled,
          deanonymizeTitle,
          abortSignal,
          logger,
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
        action,
      })
    : EMPTY;

  // Merge all event streams
  const effectiveConversationId =
    conversation.operation === 'CREATE' ? conversation.id : conversationId;
  const modelProvider = getConnectorProvider(chatModel.getConnector());

  return withConverseSpan({ agentId, conversationId: effectiveConversationId }, () =>
    merge(conversationIdEvent$, agentEvents$, persistenceEvents$).pipe(
      handleCancellation(abortSignal),
      tap((event) => {
        try {
          if (isRoundCompleteEvent(event)) {
            const isReplacingRound = action === 'regenerate' || event.data?.resumed === true;
            const currentRoundCount = isReplacingRound
              ? conversation.rounds.length
              : (conversation.rounds?.length ?? 0) + 1;

            // metering
            meteringService
              .reportExecution({
                conversationId: effectiveConversationId,
                executionId: execution.executionId,
                roundCount: currentRoundCount,
                agentId,
                round: event.data.round,
                modelProvider,
              })
              .catch((err) => {
                logger.warn(`Failed to report execution metering: ${err}`);
              });

            // snapshot telemetry tracking
            if (effectiveConversationId) {
              trackingService?.trackConversationRound(effectiveConversationId, currentRoundCount);
            }

            // EBT tracking
            analyticsService?.reportRoundComplete({
              conversationId: effectiveConversationId,
              executionId: execution.executionId,
              roundCount: currentRoundCount,
              agentId,
              round: event.data.round,
              modelProvider,
            });
          }
        } catch (error) {
          logger.error(`Failed to report round complete telemetry: ${error}`);
        }
      }),
      convertErrors({
        agentId,
        logger,
        analyticsService,
        trackingService,
        modelProvider,
        conversationId: effectiveConversationId,
        executionId: execution.executionId,
      })
    )
  );
};

// Exact token format: <ENTITY_CLASS>_<32 lowercase hex chars>, e.g. HOST_NAME_ae687f3b1c2d...
// Using exactly 32 hex chars avoids false positives on shorter hex-suffixed identifiers.
const ANONYMIZATION_TOKEN_PATTERN = /\b[A-Z][A-Z_]*_[0-9a-f]{32}\b/;

/**
 * Returns a deanonymizeTitle callback when anonymization is enabled and the conversation has a
 * replacementsId, or undefined otherwise. The callback deanonymizes the generated title and
 * guards against persisting raw tokens as the conversation title (which would be a PII leak
 * into an unencrypted field).
 */
const createDeanonymizeTitleFn = ({
  anonymizationEnabled,
  conversation,
  deps,
  request,
  logger,
}: {
  anonymizationEnabled: boolean;
  conversation: ConversationWithOperation;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  logger: Logger;
}): ((title: string) => Promise<string>) | undefined => {
  if (!anonymizationEnabled || !conversation.replacementsId) {
    return undefined;
  }

  return async (title: string) => {
    const namespace = deps.savedObjects.getScopedClient(request).getCurrentNamespace() ?? 'default';
    const result = await deps.inference.deanonymizeText(
      namespace,
      conversation.replacementsId!,
      title
    );
    if (ANONYMIZATION_TOKEN_PATTERN.test(result)) {
      logger.warn(
        `[agent_builder.anonymization.title_guard] token_pattern_detected=true replacements_id=${conversation.replacementsId} — falling back to default title`
      );
      return 'New conversation';
    }
    return result;
  };
};

/**
 * Subscribe to the event stream and append events to the execution document with 200ms batching.
 * Returns a promise that resolves when the observable completes and all events are flushed.
 */
export const collectAndWriteEvents = ({
  events$,
  execution,
  executionClient,
  logger,
}: {
  events$: Observable<ChatEvent>;
  execution: AgentExecution;
  executionClient: AgentExecutionClient;
  logger: Logger;
}): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    let pendingEvents: ChatEvent[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let flushInProgress: Promise<void> | undefined;

    const flush = async () => {
      if (pendingEvents.length === 0) {
        return;
      }
      const batch = pendingEvents;
      pendingEvents = [];
      await executionClient.appendEvents(execution.executionId, batch);
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
        pendingEvents.push(event);
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

const buildPersistenceEvents = ({
  agentId,
  conversation,
  conversationClient,
  conversationId,
  title$,
  agentEvents$,
  action,
}: {
  agentId: string;
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  conversationId?: string;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
  action?: ConversationAction;
}): Observable<ChatEvent> => {
  const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

  if (conversation.operation === 'CREATE') {
    return createConversation$({
      agentId,
      conversationClient,
      conversationId: conversationId || conversation.id,
      replacementsId: conversation.replacementsId,
      title$,
      roundCompletedEvents$,
    });
  }

  return updateConversation$({
    conversationClient,
    conversation,
    title$,
    roundCompletedEvents$,
    action,
  });
};
