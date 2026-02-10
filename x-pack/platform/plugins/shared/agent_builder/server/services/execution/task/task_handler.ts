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
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { getConnectorProvider } from '@kbn/inference-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ConversationService } from '../../conversation';
import type { ConversationClient } from '../../conversation';
import type { AgentsServiceStart } from '../../agents';
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
} from '../../chat/utils';
import { createConversationIdSetEvent } from '../../chat/utils/events';
import type { AnalyticsService, TrackingService } from '../../../telemetry';
import type { AgentExecution, AgentExecutionEventDoc } from '../types';
import { ExecutionStatus } from '../types';
import {
  createAgentExecutionClient,
  createExecutionEventsClient,
  type AgentExecutionClient,
  type ExecutionEventsClient,
} from '../persistence';
import { AbortMonitor } from './abort_monitor';

const EVENT_BATCH_INTERVAL_MS = 200;

export interface TaskHandlerDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  dataStreams: DataStreamsStart;
  spaces?: SpacesPluginStart;
  trackingService?: TrackingService;
  analyticsService?: AnalyticsService;
}

/**
 * The task handler interface used by the task definition.
 */
export interface TaskHandler {
  run(params: { executionId: string; fakeRequest: KibanaRequest }): Promise<void>;
  cancel(params: { executionId: string }): Promise<void>;
}

export const createTaskHandler = (deps: TaskHandlerDeps): TaskHandler => {
  return new TaskHandlerImpl(deps);
};

class TaskHandlerImpl implements TaskHandler {
  private readonly deps: TaskHandlerDeps;
  private readonly logger: Logger;

  constructor(deps: TaskHandlerDeps) {
    this.deps = deps;
    this.logger = deps.logger;
  }

  async run({
    executionId,
    fakeRequest,
  }: {
    executionId: string;
    fakeRequest: KibanaRequest;
  }): Promise<void> {
    const executionClient = this.createExecutionClient();
    const eventsClient = this.createEventsClient();

    // 1. Load execution document
    const execution = await executionClient.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    // 2. Update status to running
    await executionClient.updateStatus(executionId, ExecutionStatus.running);

    // 3. Set up abort monitoring
    const abortMonitor = new AbortMonitor({
      executionId,
      executionClient,
      logger: this.logger.get('abort-monitor'),
    });
    abortMonitor.start();

    try {
      // 4. Execute the agent and write events
      await this.executeAndWriteEvents({
        execution,
        fakeRequest,
        abortSignal: abortMonitor.getSignal(),
        executionClient,
        eventsClient,
      });

      // 5. Mark as completed
      await executionClient.updateStatus(executionId, ExecutionStatus.completed);
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${error.message}`);

      // Write an error event
      try {
        await this.writeErrorEvent({ execution, eventsClient, error });
      } catch (writeError) {
        this.logger.error(
          `Failed to write error event for execution ${executionId}: ${writeError.message}`
        );
      }

      // Update status to failed
      try {
        await executionClient.updateStatus(executionId, ExecutionStatus.failed);
      } catch (statusError) {
        this.logger.error(
          `Failed to update status for execution ${executionId}: ${statusError.message}`
        );
      }
    } finally {
      abortMonitor.stop();
    }
  }

  async cancel({ executionId }: { executionId: string }): Promise<void> {
    const executionClient = this.createExecutionClient();
    await executionClient.updateStatus(executionId, ExecutionStatus.aborted);
  }

  private async executeAndWriteEvents({
    execution,
    fakeRequest,
    abortSignal,
    executionClient,
    eventsClient,
  }: {
    execution: AgentExecution;
    fakeRequest: KibanaRequest;
    abortSignal: AbortSignal;
    executionClient: AgentExecutionClient;
    eventsClient: ExecutionEventsClient;
  }): Promise<void> {
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

    const { trackingService, analyticsService } = this.deps;
    const requestId = trackingService?.trackQueryStart();

    // Resolve scoped services
    const services = await resolveServices({
      agentId,
      connectorId,
      request: fakeRequest,
      ...this.deps,
    });

    // Get conversation
    const conversation = await getConversation({
      agentId,
      conversationId,
      autoCreateConversationWithId,
      conversationClient: services.conversationClient,
    });

    // Build event stream (replicating ChatService.converse logic)
    const events$ = this.buildEventStream({
      agentId,
      request: fakeRequest,
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
      requestId,
      trackingService,
      analyticsService,
    });

    // Collect all events and write them with batching
    await this.collectAndWriteEvents({
      events$,
      execution,
      eventsClient,
    });
  }

  private buildEventStream({
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
    requestId,
    trackingService,
    analyticsService,
  }: {
    agentId: string;
    request: KibanaRequest;
    nextInput: any;
    capabilities: any;
    structuredOutput?: boolean;
    outputSchema?: Record<string, unknown>;
    storeConversation: boolean;
    abortSignal: AbortSignal;
    conversation: ConversationWithOperation;
    conversationId?: string;
    conversationClient: ConversationClient;
    chatModel: any;
    selectedConnectorId: string;
    browserApiTools: any;
    configurationOverrides: any;
    requestId: string | undefined;
    trackingService?: TrackingService;
    analyticsService?: AnalyticsService;
  }): Observable<ChatEvent> {
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
      agentService: this.deps.agentService,
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
      ? this.persistConversation({
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
        logger: this.logger,
        analyticsService,
        trackingService,
        modelProvider,
        conversationId: effectiveConversationId,
      })
    );
  }

  /**
   * Replicates the persistConversation logic from ChatService.
   */
  private persistConversation({
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
  }): Observable<ChatEvent> {
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
  }

  /**
   * Subscribe to the event stream and write events to the data stream with 200ms batching.
   * Events are buffered and flushed every EVENT_BATCH_INTERVAL_MS ms.
   */
  private collectAndWriteEvents({
    events$,
    execution,
    eventsClient,
  }: {
    events$: Observable<ChatEvent>;
    execution: AgentExecution;
    eventsClient: ExecutionEventsClient;
  }): Promise<void> {
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
              this.logger.error(
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
          // Wait for any in-progress flush, then do a final flush
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
  }

  private async writeErrorEvent({
    execution,
    eventsClient,
    error,
  }: {
    execution: AgentExecution;
    eventsClient: ExecutionEventsClient;
    error: Error;
  }): Promise<void> {
    // We write a synthetic error event so the follower can detect the failure
    const errorEvent: ChatEvent = {
      type: 'error' as any,
      data: {
        message: error.message,
      },
    } as any;

    await eventsClient.writeEvents([
      {
        '@timestamp': Date.now(),
        agentExecutionId: execution.executionId,
        eventNumber: -1, // error events use -1 as they're terminal
        agentId: execution.agentId,
        spaceId: execution.spaceId,
        event: errorEvent,
      },
    ]);
  }

  private createExecutionClient(): AgentExecutionClient {
    return createAgentExecutionClient({
      logger: this.logger.get('execution-client'),
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }

  private createEventsClient(): ExecutionEventsClient {
    return createExecutionEventsClient({
      dataStreams: this.deps.dataStreams,
    });
  }
}
