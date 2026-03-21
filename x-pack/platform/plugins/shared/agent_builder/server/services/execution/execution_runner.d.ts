import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RunAgentFn } from '@kbn/agent-builder-server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ConversationService } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import type { MeteringService } from '../metering';
import type { AgentExecution, SerializedExecutionError } from './types';
import type { AgentExecutionClient } from './persistence';
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
export declare const handleAgentExecution: ({ execution, deps, request, abortSignal, }: {
    execution: AgentExecution;
    deps: AgentExecutionDeps;
    request: KibanaRequest;
    abortSignal: AbortSignal;
}) => Promise<Observable<ChatEvent>>;
/**
 * Subscribe to the event stream and append events to the execution document with 200ms batching.
 * Returns a promise that resolves when the observable completes and all events are flushed.
 */
export declare const collectAndWriteEvents: ({ events$, execution, executionClient, logger, }: {
    events$: Observable<ChatEvent>;
    execution: AgentExecution;
    executionClient: AgentExecutionClient;
    logger: Logger;
}) => Promise<void>;
/**
 * Converts an unknown error to a {@link SerializedExecutionError} for persistence.
 * - If the error is already an AgentBuilderError, serializes it using toJSON().
 * - Otherwise, wraps it as an internalError.
 */
export declare const serializeExecutionError: (error: unknown) => SerializedExecutionError;
