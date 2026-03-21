import { Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecutionClient } from './persistence';
/**
 * Wraps the polling async generator into an Observable<ChatEvent>.
 *
 * Subscribing starts the polling loop; unsubscribing stops it.
 */
export declare const followExecution$: ({ executionId, executionClient, since, }: {
    executionId: string;
    executionClient: AgentExecutionClient;
    since?: number;
}) => Observable<ChatEvent>;
