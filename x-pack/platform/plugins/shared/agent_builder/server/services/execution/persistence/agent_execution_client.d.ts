import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecution, SerializedExecutionError, FindExecutionsOptions } from '../types';
import { ExecutionStatus } from '../types';
type CreateExecutionParams = Pick<AgentExecution, 'executionId' | 'agentId' | 'spaceId' | 'agentParams' | 'metadata'>;
/**
 * Lightweight snapshot returned by {@link AgentExecutionClient.peek}.
 * Includes only the status, error, and event count — no events payload.
 */
export interface ExecutionPeek {
    status: ExecutionStatus;
    error?: SerializedExecutionError;
    eventCount: number;
}
/**
 * Client for agent execution documents.
 */
export interface AgentExecutionClient {
    /** Create a new execution document. */
    create(execution: CreateExecutionParams): Promise<AgentExecution>;
    /** Get an execution document by id (real-time GET). Returns undefined if not found. */
    get(executionId: string): Promise<AgentExecution | undefined>;
    /** Update the status of an execution, optionally persisting an error. */
    updateStatus(executionId: string, status: ExecutionStatus, error?: SerializedExecutionError): Promise<void>;
    /** Append events to an execution document using a scripted update. */
    appendEvents(executionId: string, events: ChatEvent[]): Promise<void>;
    /**
     * Lightweight status check (real-time GET with `_source_includes`).
     * Returns the status, error, and event count — without transferring the events array.
     */
    peek(executionId: string): Promise<ExecutionPeek | undefined>;
    /**
     * Read events for a given execution (real-time GET).
     * @param executionId - The execution to read events for.
     * @param since - If provided, only return events with index >= this value.
     * @returns The events slice, the current status, and the optional error.
     */
    readEvents(executionId: string, since?: number): Promise<{
        events: ChatEvent[];
        status: ExecutionStatus;
        error?: SerializedExecutionError;
    }>;
    /** Search executions by metadata and/or status filters. */
    find(options: FindExecutionsOptions): Promise<AgentExecution[]>;
}
export declare const createAgentExecutionClient: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => AgentExecutionClient;
export {};
