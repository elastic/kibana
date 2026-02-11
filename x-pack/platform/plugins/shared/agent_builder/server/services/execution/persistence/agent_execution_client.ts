/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecution, SerializedExecutionError } from '../types';
import { ExecutionStatus } from '../types';
import type { AgentExecutionProperties, AgentExecutionStorage } from './agent_execution_storage';
import { agentExecutionIndexName, createStorage } from './agent_execution_storage';

type CreateExecutionParams = Pick<
  AgentExecution,
  'executionId' | 'agentId' | 'spaceId' | 'agentParams'
>;

/**
 * Lightweight snapshot returned by {@link AgentExecutionClient.peek}.
 * Includes only the status, error, and event count — no events payload.
 */
export interface ExecutionPeek {
  status: ExecutionStatus;
  error?: SerializedExecutionError;
  eventCount: number;
}

const fromEs = (source: AgentExecutionProperties): AgentExecution => {
  return {
    executionId: source.execution_id,
    '@timestamp': source['@timestamp'],
    status: source.status,
    agentId: source.agent_id,
    spaceId: source.space_id,
    agentParams: source.agent_params,
    eventCount: source.event_count ?? 0,
    events: source.events ?? [],
    ...(source.error ? { error: source.error } : {}),
  };
};

/**
 * Client for agent execution documents.
 */
export interface AgentExecutionClient {
  /** Create a new execution document. */
  create(execution: CreateExecutionParams): Promise<AgentExecution>;

  /** Get an execution document by id (real-time GET). Returns undefined if not found. */
  get(executionId: string): Promise<AgentExecution | undefined>;

  /** Update the status of an execution, optionally persisting an error. */
  updateStatus(
    executionId: string,
    status: ExecutionStatus,
    error?: SerializedExecutionError
  ): Promise<void>;

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
  readEvents(
    executionId: string,
    since?: number
  ): Promise<{ events: ChatEvent[]; status: ExecutionStatus; error?: SerializedExecutionError }>;
}

export const createAgentExecutionClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentExecutionClient => {
  const storage = createStorage({ logger, esClient });
  return new AgentExecutionClientImpl({ storage, esClient });
};

class AgentExecutionClientImpl implements AgentExecutionClient {
  private readonly storage: AgentExecutionStorage;
  private readonly esClient: ElasticsearchClient;

  constructor({
    storage,
    esClient,
  }: {
    storage: AgentExecutionStorage;
    esClient: ElasticsearchClient;
  }) {
    this.storage = storage;
    this.esClient = esClient;
  }

  async create({
    executionId,
    agentId,
    spaceId,
    agentParams,
  }: CreateExecutionParams): Promise<AgentExecution> {
    const now = new Date().toISOString();
    const document: AgentExecutionProperties = {
      execution_id: executionId,
      '@timestamp': now,
      status: ExecutionStatus.scheduled,
      agent_id: agentId,
      space_id: spaceId,
      agent_params: agentParams,
      event_count: 0,
      events: [],
    };

    await this.storage.getClient().index({
      id: executionId,
      document,
    });

    return {
      executionId,
      '@timestamp': now,
      status: ExecutionStatus.scheduled,
      agentId,
      spaceId,
      agentParams,
      eventCount: 0,
      events: [],
    };
  }

  async get(executionId: string): Promise<AgentExecution | undefined> {
    const source = await this.getSource(executionId);
    if (!source) {
      return undefined;
    }
    return fromEs(source);
  }

  async updateStatus(
    executionId: string,
    status: ExecutionStatus,
    error?: SerializedExecutionError
  ): Promise<void> {
    await this.esClient.update({
      index: agentExecutionIndexName,
      id: executionId,
      doc: {
        status,
        ...(error ? { error } : {}),
      },
    });
  }

  async appendEvents(executionId: string, events: ChatEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.esClient.update({
      index: agentExecutionIndexName,
      id: executionId,
      script: {
        source: `
          if (ctx._source.events == null) { ctx._source.events = []; }
          for (def e : params.new_events) { ctx._source.events.add(e); }
          ctx._source.event_count = ctx._source.events.size();
        `,
        params: { new_events: events },
      },
    });
  }

  async peek(executionId: string): Promise<ExecutionPeek | undefined> {
    try {
      const response = await this.esClient.get<AgentExecutionProperties>({
        index: agentExecutionIndexName,
        id: executionId,
        _source_includes: ['status', 'error', 'event_count'] as string[],
      });
      const source = response._source;
      if (!source) {
        return undefined;
      }
      return {
        status: source.status,
        eventCount: source.event_count ?? 0,
        ...(source.error ? { error: source.error } : {}),
      };
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return undefined;
      }
      throw err;
    }
  }

  async readEvents(
    executionId: string,
    since?: number
  ): Promise<{ events: ChatEvent[]; status: ExecutionStatus; error?: SerializedExecutionError }> {
    const source = await this.getSource(executionId);
    if (!source) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const allEvents: ChatEvent[] = source.events ?? [];
    const sliceFrom = since ?? 0;

    return {
      events: allEvents.slice(sliceFrom),
      status: source.status,
      ...(source.error ? { error: source.error } : {}),
    };
  }

  /**
   * Shared helper: real-time GET on the execution document.
   */
  private async getSource(executionId: string): Promise<AgentExecutionProperties | undefined> {
    try {
      const response = await this.esClient.get<AgentExecutionProperties>({
        index: agentExecutionIndexName,
        id: executionId,
      });
      return response._source;
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return undefined;
      }
      throw err;
    }
  }
}
