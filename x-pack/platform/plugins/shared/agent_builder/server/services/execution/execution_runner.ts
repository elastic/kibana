/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  merge,
  of,
  filter,
  tap,
  catchError,
  throwError,
  EMPTY,
  Observable,
  firstValueFrom,
} from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RunAgentFn } from '@kbn/agent-builder-server';
import type { ChatEvent, ConversationAction, ConversationRound } from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  isRoundCompleteEvent,
  isAgentBuilderError,
  AgentBuilderErrorCode,
  AgentExecutionMode,
  createInternalError,
} from '@kbn/agent-builder-common';
import { getConnectorProvider } from '@kbn/inference-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SerializedExecutionError } from '@kbn/agent-builder-common';
import type {
  AgentExecution,
  ConversationAgentExecution,
  StandaloneAgentExecution,
} from '@kbn/agent-builder-server/execution';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ConversationService, ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  generateTitle,
  handleCancellation,
  executeAgent$,
  getConversation,
  updateConversation$,
  createConversation$,
  applyProgressEventToRound,
  createInProgressConversation,
  createInProgressRound,
  getTemporaryConversationTitle,
  resolveServices,
  convertErrors,
  type ConversationWithOperation,
} from './utils';
import {
  createConversationCreatedEvent,
  createConversationIdSetEvent,
  createConversationUpdatedEvent,
} from './utils/events';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import { withConverseSpan } from '../../tracing';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { MeteringService } from '../metering';
import type { AgentExecutionClient } from './persistence';

import { EVENT_BATCH_INTERVAL_MS } from './constants';

const CONVERSATION_PROGRESS_UPDATE_INTERVAL_MS = 1000;

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
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

/**
 * Unified entry point for agent execution. Dispatches to the appropriate handler
 * based on the execution mode.
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
  if (execution.executionMode === AgentExecutionMode.standalone) {
    return handleStandaloneExecution({ execution, deps, request, abortSignal });
  }
  return handleConversationExecution({ execution, deps, request, abortSignal });
};

/**
 * Handles conversation-mode execution — resolves/creates conversation, generates title,
 * persists round, reports metering and telemetry.
 */
const handleConversationExecution = async ({
  execution,
  deps,
  request,
  abortSignal,
}: {
  execution: ConversationAgentExecution;
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
    source,
    nextInput,
    browserApiTools,
    configurationOverrides,
    action,
    telemetryMetadata,
    accessControl,
  } = execution.agentParams;

  const { logger, runAgent, trackingService, analyticsService, meteringService, agentService } =
    deps;

  // Resolve scoped services
  const { conversationClient, modelProvider, selectedConnectorId } = await resolveServices({
    agentId,
    connectorId,
    telemetryMetadata,
    request,
    ...deps,
  });

  // Get conversation
  const conversation = await getConversation({
    agentId,
    conversationId,
    autoCreateConversationWithId,
    conversationClient,
    accessControl,
    source,
  });

  const initialRound =
    storeConversation && conversation.operation === 'CREATE'
      ? createInProgressRound({
          input: {
            message: nextInput.message ?? '',
            ...(nextInput.attachment_refs ? { attachment_refs: nextInput.attachment_refs } : {}),
          },
          configurationOverrides,
        })
      : undefined;

  const createdConversation = initialRound
    ? await createInProgressConversation({
        conversation,
        conversationClient,
        round: initialRound,
        title: getTemporaryConversationTitle(nextInput.message),
      })
    : undefined;

  // Emit conversation ID for new conversations (only when persisting)
  const conversationIdEvent$ =
    createdConversation !== undefined
      ? of(createConversationCreatedEvent(createdConversation))
      : storeConversation && conversation.operation === 'CREATE'
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
    telemetryMetadata,
    runAgent,
    browserApiTools,
    configurationOverrides,
    action,
  });

  // Generate title (for CREATE) or use existing title (for UPDATE)
  const title$ =
    conversation.operation === 'CREATE'
      ? generateTitle({
          chatModel: (await modelProvider.selectModel({ effortLevel: 'low' })).chatModel,
          conversation,
          nextInput,
        })
      : of(conversation.title);

  // Persist conversation (optional)
  const persistenceEvents$ = storeConversation
    ? createdConversation && initialRound
      ? buildInProgressPersistenceEvents({
          conversation,
          conversationClient,
          title$,
          agentEvents$,
          initialRound,
          logger,
        })
      : buildPersistenceEvents({
          conversation,
          conversationClient,
          title$,
          agentEvents$,
          action,
        })
    : EMPTY;

  const chatModel = (await modelProvider.getDefaultModel()).chatModel;
  const connectorProvider = getConnectorProvider(chatModel.getConnector());

  const agentRegistry = await agentService.getRegistry({ request });
  const { name: agentName } = await agentRegistry.get(agentId);

  const { headers } = request;
  const opikTraceId = headers.opik_trace_id as string | undefined;
  const opikParentSpanId = headers.opik_parent_span_id as string | undefined;
  const opikHeaders =
    opikTraceId && opikParentSpanId
      ? { opik_trace_id: opikTraceId, opik_parent_span_id: opikParentSpanId }
      : undefined;

  const spaceId = getCurrentSpaceId({ request, spaces: deps.spaces });

  return withConverseSpan(
    {
      agentId,
      agentName,
      providerName: connectorProvider,
      conversationId: conversation.id,
      spaceId,
      opikHeaders,
    },
    () =>
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
                  conversationId: conversation.id,
                  executionId: execution.executionId,
                  roundCount: currentRoundCount,
                  agentId,
                  round: event.data.round,
                  modelProvider: connectorProvider,
                })
                .catch((err) => {
                  logger.warn(`Failed to report execution metering: ${err}`);
                });

              // snapshot telemetry tracking
              trackingService?.trackConversationRound(conversation.id, currentRoundCount);

              // EBT tracking
              analyticsService?.reportRoundComplete({
                conversationId: conversation.id,
                executionId: execution.executionId,
                roundCount: currentRoundCount,
                agentId,
                round: event.data.round,
                modelProvider: connectorProvider,
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
          modelProvider: connectorProvider,
          conversationId: conversation.id,
          executionId: execution.executionId,
        })
      )
  );
};

/**
 * Subscribe to the event stream and append events to the execution document with 200ms batching.
 * Returns a promise that resolves with the collected events when the observable completes and all events are flushed.
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
}): Promise<ChatEvent[]> => {
  return new Promise<ChatEvent[]>((resolve, reject) => {
    const collectedEvents: ChatEvent[] = [];
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
        collectedEvents.push(event);
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
        finalFlush().then(() => resolve(collectedEvents), reject);
      },
    });
  });
};

/**
 * Converts an unknown error to a {@link SerializedExecutionError} for persistence.
 * - If the error is already an AgentBuilderError, serializes it using toJSON().
 * - Otherwise, wraps it as an internalError, preserving the HTTP status from
 *   Boom-style errors (or any error carrying a numeric `statusCode`) in
 *   `meta.statusCode` so the route layer can return the correct code.
 */
export const serializeExecutionError = (error: unknown): SerializedExecutionError => {
  if (isAgentBuilderError(error)) {
    return { code: error.code as AgentBuilderErrorCode, message: error.message, meta: error.meta };
  }
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = getHttpStatusFromError(error);
  return {
    code: AgentBuilderErrorCode.internalError,
    message,
    ...(statusCode !== undefined ? { meta: { statusCode } } : {}),
  };
};

const getHttpStatusFromError = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { output, statusCode } = error as {
    output?: { statusCode?: unknown };
    statusCode?: unknown;
  };
  const candidate =
    typeof output?.statusCode === 'number'
      ? output.statusCode
      : typeof statusCode === 'number'
      ? statusCode
      : undefined;
  return typeof candidate === 'number' && candidate >= 400 && candidate < 600
    ? candidate
    : undefined;
};

const buildPersistenceEvents = ({
  conversation,
  conversationClient,
  title$,
  agentEvents$,
  action,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
  action?: ConversationAction;
}): Observable<ChatEvent> => {
  const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

  if (conversation.operation === 'CREATE') {
    return createConversation$({
      conversation,
      conversationClient,
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

const buildInProgressPersistenceEvents = ({
  conversation,
  conversationClient,
  title$,
  agentEvents$,
  initialRound,
  logger,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
  initialRound: ConversationRound;
  logger: Logger;
}): Observable<ChatEvent> => {
  return new Observable<ChatEvent>((subscriber) => {
    const titlePromise = firstValueFrom(title$);
    const round = initialRound;
    let dirty = false;
    let finalized = false;
    let progressTimer: ReturnType<typeof setTimeout> | undefined;
    let progressUpdate: Promise<void> = Promise.resolve();

    const clearProgressTimer = () => {
      if (progressTimer !== undefined) {
        clearTimeout(progressTimer);
        progressTimer = undefined;
      }
    };

    const persistProgress = () => {
      progressTimer = undefined;
      if (!dirty || finalized) return;
      dirty = false;
      const snapshot = JSON.parse(JSON.stringify(round)) as ConversationRound;
      progressUpdate = progressUpdate
        .then(async () => {
          await conversationClient.update(
            {
              id: conversation.id,
              rounds: [snapshot],
              status: snapshot.status,
              read: false,
            },
            { access: 'converse' }
          );
        })
        .catch((error) => {
          logger.debug(`Failed to persist in-progress conversation: ${(error as Error).message}`);
        });
    };

    const scheduleProgress = () => {
      if (progressTimer === undefined && !finalized) {
        progressTimer = setTimeout(persistProgress, CONVERSATION_PROGRESS_UPDATE_INTERVAL_MS);
      }
    };

    const subscription = agentEvents$.subscribe({
      next: (event) => {
        if (isRoundCompleteEvent(event)) {
          finalized = true;
          dirty = false;
          clearProgressTimer();

          const complete = async () => {
            await progressUpdate;
            const title = await titlePromise;
            const finalRound = event.data.round;
            const updatedConversation = await conversationClient.update(
              {
                id: conversation.id,
                title,
                rounds: [finalRound],
                state: event.data.conversation_state,
                status: finalRound.status,
                read: false,
                ...(event.data.attachments !== undefined
                  ? { attachments: event.data.attachments }
                  : {}),
                ...(event.data.workspace_id ? { workspace_id: event.data.workspace_id } : {}),
              },
              { access: 'converse' }
            );
            subscriber.next(createConversationUpdatedEvent(updatedConversation));
            subscriber.complete();
          };

          complete().catch((error) => subscriber.error(error));
          return;
        }

        if (applyProgressEventToRound({ round, event })) {
          dirty = true;
          scheduleProgress();
        }
      },
      error: (error) => {
        clearProgressTimer();
        subscriber.error(error);
      },
      complete: () => {
        clearProgressTimer();
        if (!finalized) {
          subscriber.complete();
        }
      },
    });

    return () => {
      clearProgressTimer();
      subscription.unsubscribe();
    };
  });
};

/**
 * Handles a standalone agent execution — no conversation resolution, no title generation,
 * no persistence events, and no metering/telemetry.
 */
const handleStandaloneExecution = async ({
  execution,
  deps,
  request,
  abortSignal,
}: {
  execution: StandaloneAgentExecution;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  abortSignal: AbortSignal;
}): Promise<Observable<ChatEvent>> => {
  const agentId = execution.agentId;
  const { logger, runAgent } = deps;
  const { telemetryMetadata } = execution.agentParams;

  const { selectedConnectorId } = await resolveServices({
    agentId,
    connectorId: execution.agentParams.connectorId,
    telemetryMetadata,
    request,
    ...deps,
  });

  const agentEvents$ = executeAgent$({
    agentId,
    executionId: execution.executionId,
    request,
    nextInput: execution.agentParams.nextInput,
    capabilities: execution.agentParams.capabilities,
    abortSignal,
    conversation: undefined,
    defaultConnectorId: selectedConnectorId,
    telemetryMetadata,
    runAgent,
    executionMode: AgentExecutionMode.standalone,
  });

  return agentEvents$.pipe(
    handleCancellation(abortSignal),
    catchError((err) => {
      logger.error(`Error executing standalone agent: ${err.stack ?? err.message}`);
      return throwError(() => {
        if (isAgentBuilderError(err)) {
          return err;
        }
        return createInternalError(`Error executing standalone agent: ${err.message}`, {
          statusCode: 500,
        });
      });
    })
  );
};
