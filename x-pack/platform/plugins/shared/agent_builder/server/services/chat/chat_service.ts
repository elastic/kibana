/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { filter, of, defer, shareReplay, switchMap, merge, mergeMap, EMPTY, from } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  type ChatEvent,
  type ConverseInput,
  agentBuilderDefaultAgentId,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { getConnectorProvider } from '@kbn/inference-common';
import { withConverseSpan } from '../../tracing';
import type { ConversationService } from '../conversation';
import type { ConversationClient } from '../conversation';
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
import type { ChatService, ChatConverseParams } from './types';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import type { HooksServiceStart } from '../hooks';
import { HookLifecycle } from '../hooks';

interface ChatServiceDeps {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  trackingService?: TrackingService;
  analyticsService?: AnalyticsService;
  hooks?: HooksServiceStart;
}

export const createChatService = (options: ChatServiceDeps): ChatService => {
  return new ChatServiceImpl(options);
};

class ChatServiceImpl implements ChatService {
  private readonly dependencies: ChatServiceDeps;

  constructor(deps: ChatServiceDeps) {
    this.dependencies = deps;
  }

  converse({
    agentId = agentBuilderDefaultAgentId,
    conversationId,
    connectorId,
    capabilities,
    structuredOutput,
    outputSchema,
    storeConversation = true,
    request,
    abortSignal,
    nextInput: initialNextInput,
    autoCreateConversationWithId = false,
    browserApiTools,
    configurationOverrides,
  }: ChatConverseParams): Observable<ChatEvent> {
    const { trackingService, analyticsService } = this.dependencies;
    const requestId = trackingService?.trackQueryStart();

    return withConverseSpan({ agentId, conversationId }, (span) => {
      // Resolve scoped services
      return defer(async () => {
        const services = await resolveServices({
          agentId,
          connectorId,
          request,
          ...this.dependencies,
        });

        span?.setAttribute('elastic.connector.id', services.selectedConnectorId);

        // Get conversation and determine operation (CREATE or UPDATE)
        const conversation = await getConversation({
          agentId,
          conversationId,
          autoCreateConversationWithId,
          conversationClient: services.conversationClient,
        });

        const effectiveNextInput = await runBeforeConversationRoundHook({
          agentId,
          request,
          abortSignal,
          conversation,
          nextInput: initialNextInput,
          hooks: this.dependencies.hooks,
        });

        return {
          conversation,
          conversationClient: services.conversationClient,
          chatModel: services.chatModel,
          selectedConnectorId: services.selectedConnectorId,
          effectiveNextInput,
        };
      }).pipe(
        switchMap((context) => {
          // Emit conversation ID for new conversations (only when persisting)
          const conversationIdEvent$ =
            storeConversation && context.conversation.operation === 'CREATE'
              ? of(createConversationIdSetEvent(context.conversation.id))
              : EMPTY;

          // Execute agent
          const agentEvents$ = executeAgent$({
            agentId,
            request,
            nextInput: context.effectiveNextInput,
            capabilities,
            structuredOutput,
            outputSchema,
            abortSignal,
            conversation: context.conversation,
            defaultConnectorId: context.selectedConnectorId,
            agentService: this.dependencies.agentService,
            browserApiTools,
            configurationOverrides,
          })
            .pipe(
              mergeMap(
                runAfterConversationRoundHook({
                  agentId,
                  request,
                  abortSignal,
                  conversation: context.conversation,
                  hooks: this.dependencies.hooks,
                })
              )
            )
            .pipe(shareReplay());

          // Generate title (for CREATE) or use existing title (for UPDATE)
          const title$ =
            context.conversation.operation === 'CREATE'
              ? generateTitle({
                  chatModel: context.chatModel,
                  conversation: context.conversation,
                  nextInput: context.effectiveNextInput,
                })
              : of(context.conversation.title);

          // Persist conversation (optional)
          const persistenceEvents$ = storeConversation
            ? persistConversation({
                agentId,
                conversation: context.conversation,
                conversationClient: context.conversationClient,
                conversationId,
                title$,
                agentEvents$,
              })
            : EMPTY;

          // Merge all event streams
          const effectiveConversationId =
            context.conversation.operation === 'CREATE' ? context.conversation.id : conversationId;
          const modelProvider = getConnectorProvider(context.chatModel.getConnector());
          return merge(conversationIdEvent$, agentEvents$, persistenceEvents$).pipe(
            handleCancellation(abortSignal),
            convertErrors({
              agentId,
              logger: this.dependencies.logger,
              analyticsService,
              trackingService,
              modelProvider,
              conversationId: effectiveConversationId,
            }),
            tap((event) => {
              // Track round completion and query-to-result time
              try {
                if (isRoundCompleteEvent(event)) {
                  if (requestId) trackingService?.trackQueryEnd(requestId);
                  const currentRoundCount = (context.conversation.rounds?.length ?? 0) + 1;
                  if (conversationId) {
                    trackingService?.trackConversationRound(conversationId, currentRoundCount);
                  }

                  analyticsService?.reportRoundComplete({
                    conversationId: effectiveConversationId,
                    roundCount: currentRoundCount,
                    agentId,
                    round: event.data.round,
                    modelProvider,
                  });
                }
              } catch (error) {
                this.dependencies.logger.error(error);
              }
            }),
            shareReplay() // Required to prevent multiple subscriptions to the same event stream
          );
        })
      );
    });
  }
}

/**
 * Runs beforeConversationRound hook and returns the effective nextInput (from hook or original).
 */
const runBeforeConversationRoundHook = async ({
  agentId,
  request,
  abortSignal,
  conversation,
  nextInput,
  hooks,
}: {
  agentId: string;
  request: ChatConverseParams['request'];
  abortSignal: AbortSignal | undefined;
  conversation: ConversationWithOperation;
  nextInput: ConverseInput;
  hooks: HooksServiceStart | undefined;
}): Promise<ConverseInput> => {
  if (hooks) {
    const hookContext = await hooks.run(HookLifecycle.beforeConversationRound, {
      agentId,
      request,
      abortSignal,
      conversation,
      nextInput,
    });
    return hookContext.nextInput ?? nextInput;
  }
  return nextInput;
};

/**
 * Runs afterConversationRound hook on round-complete events and overwrites the round with the hook result.
 */
const runAfterConversationRoundHook =
  ({
    agentId,
    request,
    abortSignal,
    conversation,
    hooks,
  }: {
    agentId: string;
    request: ChatConverseParams['request'];
    abortSignal: AbortSignal | undefined;
    conversation: ConversationWithOperation;
    hooks: HooksServiceStart | undefined;
  }) =>
  (event: ChatEvent): Observable<ChatEvent> => {
    if (isRoundCompleteEvent(event) && hooks) {
      return from(
        hooks
          .run(HookLifecycle.afterConversationRound, {
            agentId,
            request,
            abortSignal,
            conversation,
            round: event.data.round,
          })
          .then(({ round }) => ({
            ...event,
            data: {
              ...event.data,
              round,
            },
          }))
      );
    }
    return of(event);
  };

/**
 * Creates events for conversation persistence (create/update)
 */
const persistConversation = ({
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
