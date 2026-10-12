/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  merge,
  of,
  from,
  concat,
  filter,
  identity,
  map,
  tap,
  catchError,
  throwError,
  EMPTY,
  shareReplay,
  ignoreElements,
  concatMap,
  take,
} from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ExecutionConversationAccess, RunAgentFn } from '@kbn/agent-builder-server';
import type { ConversationOperation } from '@kbn/agent-builder-server/execution';
import type { ChatEvent, ConverseInput, ConversationRoundAuthor } from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  isRoundCompleteEvent,
  isRoundStartedEvent,
  isRoundInterruptedEvent,
  isAgentBuilderError,
  AgentExecutionMode,
  createInternalError,
  normalizeInteractive,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import type { InteractivityConfig } from '@kbn/agent-builder-common';
import { getConnectorProvider } from '@kbn/inference-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  AgentExecution,
  ConversationAgentExecution,
  StandaloneAgentExecution,
} from '@kbn/agent-builder-server/execution';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { ElasticGenAIAttributes, UserAttributes } from '@kbn/inference-tracing';
import type { Span } from '@opentelemetry/api';
import type { ConversationService, ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  generateTitle,
  handleCancellation,
  createAbortedError,
  executeAgent$,
  appendRoundTerminated$,
  appendResumeExecution$,
  executionStartedEvents$,
  getConversation,
  resolveServices,
  convertErrors,
  toClientError,
  isPendingResumeConversation,
  isPlaceholderUser,
  resolveTelemetryOrigin,
  persistExecutionInterruption,
  trackExecutionInterruption,
  type ConversationWithOperation,
} from './utils';
import { reportRoundTelemetry } from './utils/report_round_telemetry';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import { getCurrentTraceId, loadTracingPrivacySettings, withConverseSpan } from '../../tracing';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { MeteringService } from '../metering';
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
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  meteringService: MeteringService;
  trackingService?: TrackingService;
  analyticsService?: AnalyticsService;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

export const setUserAttributes = (
  span: Span | undefined,
  user: { id?: string; username?: string }
): void => {
  if (!span) {
    return;
  }
  if (user.id) {
    span.setAttribute(UserAttributes.UserId, user.id);
  }
  if (user.username) {
    span.setAttribute(UserAttributes.UserName, user.username);
  }
};
/**
 * Unified entry point for agent execution. Dispatches to the appropriate handler
 * based on the execution mode.
 */
export const handleAgentExecution = async ({
  execution,
  deps,
  request,
  abortSignal,
  interactivity,
}: {
  execution: AgentExecution;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  abortSignal: AbortSignal;
  interactivity?: InteractivityConfig;
}): Promise<Observable<ChatEvent>> => {
  const resolvedInteractivity: InteractivityConfig =
    interactivity ??
    execution.interactivity ??
    normalizeInteractive(undefined, execution.executionMode);
  if (execution.executionMode === AgentExecutionMode.standalone) {
    return handleStandaloneExecution({
      execution,
      deps,
      request,
      abortSignal,
      interactivity: resolvedInteractivity,
    });
  }
  return handleConversationExecution({
    execution,
    deps,
    request,
    abortSignal,
    interactivity: resolvedInteractivity,
  });
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
  interactivity,
}: {
  execution: ConversationAgentExecution;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  abortSignal: AbortSignal;
  interactivity: InteractivityConfig;
}): Promise<Observable<ChatEvent>> => {
  const {
    agentId = agentBuilderDefaultAgentId,
    connectorId,
    conversationId,
    structuredOutput,
    outputSchema,
    storeConversation = true,
    accessControl,
    readOnly,
    origin,
    nextInput,
    browserApiTools,
    configurationOverrides,
    telemetryMetadata,
    maxContentLength,
    reasoningLevel,
    subagentCreation,
    projectRouting,
    roundId,
    conversationOperation,
    receivedAt: receivedAtIso,
  } = execution.agentParams;

  const { owner } = execution;

  // A record written before the execution service resolved all of these cannot be run.
  if (!conversationId || !roundId || !conversationOperation || !owner || !receivedAtIso) {
    throw createInternalError('Execution is missing required conversation parameters');
  }

  const { logger, runAgent, trackingService, analyticsService, meteringService, agentService } =
    deps;

  const conversationClient = await deps.conversationService.getScopedClientAsUser({
    request,
    user: { ...owner, isAdmin: false },
  });

  const author = conversationClient.getAuthor(origin?.author);

  // The execution service resolved the conversation, created it when it was new and wrote the
  // opening user message before this run was dispatched: the run reads the stored document and is
  // told how the request resolved it, since its own read only ever sees an update. An existing
  // conversation is read even when the run stores nothing, so a deleted one fails the run instead of
  // being replaced by an empty placeholder; only a non-storing new conversation resolves the
  // placeholder here, as nothing was written for it.
  const conversation: ConversationWithOperation =
    storeConversation || conversationOperation === 'UPDATE'
      ? { ...(await conversationClient.get(conversationId)), operation: conversationOperation }
      : await getConversation({
          agentId,
          conversationId,
          autoCreateConversationWithId: true,
          conversationClient,
          accessControl,
          readOnly,
          origin: origin
            ? { external_conversation_id: origin.external_conversation_id }
            : undefined,
          subagentCreation,
        });
  const conversationAccess = toConversationAccess({ storeConversation, conversationOperation });

  // Matches the receipt-time write's timestamp, so a rebuilt interruption event lands with the
  // same created_at rather than moving to when this run picked the record up.
  const receivedAt = new Date(receivedAtIso);

  const roundOrigin = origin ? { type: origin.type } : undefined;
  const telemetryOrigin = resolveTelemetryOrigin({ conversation, requestOrigin: origin?.type });

  // From here on the receipt-time `user_message` is stored (fresh round) or a pending round is
  // being resumed: any rejection before the stream exists would leave it dangling, so the setup
  // window is guarded and its failure recorded as an interrupted execution. Service/connector
  // resolution moved inside this guard too, so a run that fails to resolve one still gets a
  // terminal recorded next to the message that was already persisted.
  try {
    // Captured once, before the first model call, so every EIS call in this round (including
    // the title-generation and default-connector lookups below, which run ahead of the
    // `invoke_agent` span) reports the same trace id rather than whichever span happened to be
    // active when the model-provider's (memoized) telemetry metadata was first resolved.
    const roundTraceId = getCurrentTraceId();
    const roundTelemetryMetadata = roundTraceId
      ? { ...telemetryMetadata, traceId: roundTraceId }
      : telemetryMetadata;

    const { modelProvider, selectedConnectorId } = await resolveServices({
      agentId,
      connectorId,
      telemetryMetadata: roundTelemetryMetadata,
      request,
      ...deps,
    });

    // Execute agent
    const agentEvents$ = executeAgent$({
      agentId,
      executionId: execution.executionId,
      request,
      nextInput,
      origin,
      author,
      structuredOutput,
      outputSchema,
      abortSignal,
      conversation,
      defaultConnectorId: selectedConnectorId,
      telemetryMetadata: roundTelemetryMetadata,
      maxContentLength,
      reasoningLevel,
      runAgent,
      browserApiTools,
      configurationOverrides,
      interactivity,
      parentExecutionId: execution.parentExecutionId,
      projectRouting,
      roundId,
      conversationAccess,
    });

    // Generate title when creating a new conversation
    // OR when the conversation still carries the default placeholder title
    const needsTitle =
      storeConversation && conversationNeedsTitle(conversation) && !subagentCreation;
    const spaceId = getCurrentSpaceId({ request, spaces: deps.spaces });
    const [titleChatModel, { chatModel }, { name: agentName }, privacySettings] = await Promise.all(
      [
        needsTitle
          ? modelProvider.selectModel({ effortLevel: 'low' }).then((model) => model.chatModel)
          : undefined,
        modelProvider.getDefaultModel(),
        agentService.getRegistry({ request }).then((registry) => registry.get(agentId)),
        loadTracingPrivacySettings({
          uiSettingsClient: deps.uiSettings.asScopedToClient(
            deps.savedObjects.getScopedClient(request)
          ),
          logger,
          spaceId,
        }),
      ]
    );
    const connectorProvider = getConnectorProvider(chatModel.getConnector());

    const title$ = (
      titleChatModel
        ? generateTitle({ chatModel: titleChatModel, conversation, nextInput })
        : of(conversation.title)
    ).pipe(shareReplay(1));

    // Persist conversation (optional)
    const persistenceEvents$ = storeConversation
      ? buildPersistenceEvents({
          conversation,
          conversationClient,
          title$,
          agentEvents$,
          nextInput,
          author,
        })
      : EMPTY;

    const startedEvents$ = storeConversation
      ? executionStartedEvents$({ conversation, agentEvents$ })
      : EMPTY;

    const { headers } = request;
    const opikTraceId = headers.opik_trace_id as string | undefined;
    const opikParentSpanId = headers.opik_parent_span_id as string | undefined;
    const opikHeaders =
      opikTraceId && opikParentSpanId
        ? { opik_trace_id: opikTraceId, opik_parent_span_id: opikParentSpanId }
        : undefined;

    return withConverseSpan(
      {
        agentId,
        agentName,
        providerName: connectorProvider,
        conversationId: conversation.id,
        spaceId,
        privacySettings,
        opikHeaders,
      },
      (span) => {
        // The conversation is stored by now, so its owner is known — except for a run that does
        // not store one, whose placeholder owner is nobody and stays unreported.
        if (author || !isPlaceholderUser(conversation.user)) {
          setUserAttributes(span, {
            id: author?.id ?? conversation.user.id,
            username: author?.username ?? conversation.user.username,
          });
        }

        const titleAttr$ = storeConversation
          ? title$.pipe(
              tap((title) => {
                span?.setAttribute(ElasticGenAIAttributes.ConversationTitle, title);
              }),
              ignoreElements()
            )
          : EMPTY;

        return merge(agentEvents$, startedEvents$, persistenceEvents$, titleAttr$).pipe(
          // Graceful cancellation first, so an abort is normalised to RequestAbortedError before the
          // interruption tracker classifies the error.
          handleCancellation(abortSignal),
          storeConversation
            ? trackExecutionInterruption({
                persist: ({ error, interrupted, completed }) =>
                  persistExecutionInterruption({
                    conversation,
                    conversationClient,
                    roundId,
                    receivedAt,
                    input: nextInput,
                    author,
                    origin: roundOrigin,
                    error,
                    interrupted,
                    completed,
                    logger,
                  }),
              })
            : identity,
          // `round_started` / `round_interrupted` are internal plumbing for the persistence layer.
          filter((event) => !isRoundStartedEvent(event) && !isRoundInterruptedEvent(event)),
          tap((event) => {
            if (isRoundCompleteEvent(event)) {
              reportRoundTelemetry({
                event,
                conversation,
                nextInput,
                agentId,
                executionId: execution.executionId,
                modelProvider: connectorProvider,
                meteringService,
                trackingService,
                analyticsService,
                logger,
              });
            }
          }),
          // Must stay below the telemetry tap: `resume_execution` carries the unmerged per-execution
          // round that telemetry needs, and is only stripped so it doesn't reach the client.
          map(stripResumeExecution),
          convertErrors({
            agentId,
            logger,
            analyticsService,
            trackingService,
            modelProvider: connectorProvider,
            conversationId: conversation.id,
            executionId: execution.executionId,
            roundOrigin: telemetryOrigin,
          })
        );
      }
    );
  } catch (err) {
    // Normalised once so the conversation terminal, the execution document and the client all
    // carry the same error.
    // A Boom-style 4xx from a setup dependency (auth, not found) used to reach the route unchanged;
    // keep its status. Mid-run dependency failures stay 500 (see `toClientError`).
    const normalized = abortSignal.aborted
      ? createAbortedError(abortSignal)
      : toClientError(err, { preserveHttpStatus: true });
    const terminals = storeConversation
      ? await persistExecutionInterruption({
          conversation,
          conversationClient,
          roundId,
          receivedAt,
          input: nextInput,
          author,
          origin: roundOrigin,
          error: normalized,
          logger,
        })
      : [];
    // Surfaced as a stream — the persisted terminal, then the error — so live clients and
    // followers see the same thing a reloaded conversation shows, and the stream-based status
    // writers record the outcome exactly as they do for a failure mid-run.
    return concat(
      from(terminals as ChatEvent[]),
      throwError(() => normalized)
    );
  }
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

    let lastFlushAt = 0;

    // Leading edge: the first event after an idle period is written on the next tick, while
    // flushes still start at most once per batch interval.
    const scheduleFlush = () => {
      if (flushTimer === undefined) {
        const delay = Math.max(0, lastFlushAt + EVENT_BATCH_INTERVAL_MS - Date.now());
        flushTimer = setTimeout(() => {
          flushTimer = undefined;
          lastFlushAt = Date.now();
          flushInProgress = flush().catch((err) => {
            logger.error(
              `Failed to flush events for execution ${execution.executionId}: ${err.message}`
            );
          });
        }, delay);
      }
    };

    const cleanup = () => {
      if (flushTimer !== undefined) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
    };

    const finalFlush = async () => {
      if (flushInProgress) {
        await flushInProgress;
      }
      await flush();
    };

    events$.subscribe({
      next: (event) => {
        pendingEvents.push(event);
        scheduleFlush();
      },
      error: (err) => {
        cleanup();
        // The batch holding the terminal timeline event must land before the failure is recorded,
        // otherwise no follower could ever see it.
        finalFlush()
          .catch((flushErr) => {
            logger.error(
              `Failed to flush events for execution ${execution.executionId} after error: ${flushErr.message}`
            );
          })
          .finally(() => reject(err));
      },
      complete: () => {
        cleanup();
        finalFlush().then(resolve, reject);
      },
    });
  });
};

const conversationNeedsTitle = (conversation: { title?: string }): boolean =>
  !conversation.title || conversation.title === DEFAULT_CONVERSATION_TITLE;

const stripResumeExecution = (event: ChatEvent): ChatEvent => {
  if (!isRoundCompleteEvent(event) || !event.data.resume_execution) {
    return event;
  }
  const { resume_execution: _resumeExecution, ...data } = event.data;
  return { ...event, data };
};

const buildPersistenceEvents = ({
  conversation,
  conversationClient,
  title$,
  agentEvents$,
  nextInput,
  author,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
  nextInput: ConverseInput;
  author?: ConversationRoundAuthor;
}): Observable<ChatEvent> => {
  const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

  const isResume = isPendingResumeConversation(conversation);
  const useTwoPhase = !isResume;

  if (useTwoPhase) {
    const roundStartedEvents$ = agentEvents$.pipe(filter(isRoundStartedEvent));
    const endTitle$ = conversationNeedsTitle(conversation) ? title$ : undefined;

    return roundStartedEvents$.pipe(
      concatMap((startEvent) =>
        appendRoundTerminated$({
          conversation,
          conversationClient,
          roundCompletedEvents$: roundCompletedEvents$.pipe(
            filter((event) => event.data.round.id === startEvent.data.round_id),
            take(1)
          ),
          title$: endTitle$,
        })
      )
    );
  }

  // A resume appends a new execution (append-only); the pause is never rewritten. This also covers
  // legacy (non events-native) documents: `fromEs` derives their timeline from rounds on read, so
  // the append writes the full projection and promotes the document to events-native.
  return appendResumeExecution$({
    conversation,
    conversationClient,
    roundCompletedEvents$,
    input: nextInput,
    author,
    title$: conversationNeedsTitle(conversation) ? title$ : undefined,
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
  interactivity,
}: {
  execution: StandaloneAgentExecution;
  deps: AgentExecutionDeps;
  request: KibanaRequest;
  abortSignal: AbortSignal;
  interactivity: InteractivityConfig;
}): Promise<Observable<ChatEvent>> => {
  const agentId = execution.agentId;
  const { logger, runAgent } = deps;
  const {
    telemetryMetadata,
    maxContentLength,
    reasoningLevel,
    projectRouting,
    structuredOutput,
    outputSchema,
  } = execution.agentParams;

  // See the matching comment in handleConversationExecution: captured once, ahead of the first
  // model call, so every EIS call in this execution reports the same trace id.
  const roundTraceId = getCurrentTraceId();
  const roundTelemetryMetadata = roundTraceId
    ? { ...telemetryMetadata, traceId: roundTraceId }
    : telemetryMetadata;

  const { selectedConnectorId } = await resolveServices({
    agentId,
    connectorId: execution.agentParams.connectorId,
    telemetryMetadata: roundTelemetryMetadata,
    request,
    ...deps,
  });

  const agentEvents$ = executeAgent$({
    agentId,
    executionId: execution.executionId,
    request,
    nextInput: execution.agentParams.nextInput,
    structuredOutput,
    outputSchema,
    abortSignal,
    conversation: undefined,
    defaultConnectorId: selectedConnectorId,
    telemetryMetadata: roundTelemetryMetadata,
    maxContentLength,
    reasoningLevel,
    runAgent,
    projectRouting,
    executionMode: AgentExecutionMode.standalone,
    interactivity,
    parentExecutionId: execution.parentExecutionId,
  });

  return agentEvents$.pipe(
    filter((event) => !isRoundStartedEvent(event) && !isRoundInterruptedEvent(event)),
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

const toConversationAccess = ({
  storeConversation,
  conversationOperation,
}: {
  storeConversation: boolean;
  conversationOperation: ConversationOperation;
}): ExecutionConversationAccess => {
  if (storeConversation) {
    return 'readWrite';
  }
  return conversationOperation === 'UPDATE' ? 'readOnly' : 'none';
};
