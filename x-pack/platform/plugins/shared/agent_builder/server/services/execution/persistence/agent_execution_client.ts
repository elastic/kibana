/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type {
  ChatEvent,
  ExecutionAbortReason,
  SerializedExecutionError,
  UserIdAndName,
} from '@kbn/agent-builder-common';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecution, FindExecutionsOptions } from '@kbn/agent-builder-server/execution';
import type { AgentExecutionProperties, AgentExecutionStorage } from './agent_execution_storage';
import { agentExecutionIndexName, createStorage } from './agent_execution_storage';

const UPDATE_RETRY_ON_CONFLICT = 3;

type CreateExecutionParams = Pick<
  AgentExecution,
  | 'executionId'
  | 'agentId'
  | 'spaceId'
  | 'agentParams'
  | 'metadata'
  | 'executionMode'
  | 'interactivity'
  | 'parentExecutionId'
  | 'owner'
>;

/** What a status update records alongside the status. */
export interface UpdateExecutionStatusOptions {
  /** The error that ended the execution (`failed`, or the abort error for `aborted`). */
  error?: SerializedExecutionError;
  /** Where the abort came from; only meaningful with `aborted`. */
  abortReason?: ExecutionAbortReason;
}

/** Lightweight snapshot returned by {@link AgentExecutionClient.peek}, without the events. */
export interface ExecutionPeek {
  status: ExecutionStatus;
  error?: SerializedExecutionError;
  eventCount: number;
  lastHeartbeat?: string;
  conversationId?: string;
  owner?: UserIdAndName;
}

const fromEs = (source: AgentExecutionProperties): AgentExecution => {
  return {
    executionId: source.execution_id,
    '@timestamp': source['@timestamp'],
    ...(source.last_heartbeat ? { lastHeartbeat: source.last_heartbeat } : {}),
    status: source.status,
    agentId: source.agent_id,
    executionMode: source.execution_mode ?? AgentExecutionMode.conversation,
    ...(source.interactivity ? { interactivity: source.interactivity } : {}),
    ...(source.parent_execution_id ? { parentExecutionId: source.parent_execution_id } : {}),
    spaceId: source.space_id,
    ...(source.owner ? { owner: source.owner } : {}),
    agentParams: source.agent_params,
    eventCount: source.event_count ?? 0,
    events: source.events ?? [],
    ...(source.error ? { error: source.error } : {}),
    ...(source.abort_reason ? { abortReason: source.abort_reason } : {}),
    ...(source.metadata ? { metadata: source.metadata } : {}),
  } as AgentExecution;
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
  /**
   * Updates the execution status. `aborted` is sticky against a later `failed` or `completed`.
   * `error` and `abortReason` are recorded when given.
   */
  updateStatus(
    executionId: string,
    status: ExecutionStatus,
    options?: UpdateExecutionStatusOptions
  ): Promise<void>;

  /** Append events to an execution document using a scripted update. */
  appendEvents(executionId: string, events: ChatEvent[]): Promise<void>;

  /** Update the execution's `last_heartbeat` to the current time (liveness signal). */
  updateHeartbeat(executionId: string): Promise<void>;

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

  /** Search executions by metadata and/or status filters. */
  find(options: FindExecutionsOptions): Promise<AgentExecution[]>;
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
    metadata,
    executionMode,
    interactivity,
    parentExecutionId,
    owner,
  }: CreateExecutionParams): Promise<AgentExecution> {
    if (metadata) {
      for (const key of Object.keys(metadata)) {
        if (!key) {
          throw new Error(`Invalid metadata key "${key}": keys must be non-empty`);
        }
      }
    }

    const now = new Date().toISOString();
    const document: AgentExecutionProperties = {
      execution_id: executionId,
      '@timestamp': now,
      last_heartbeat: now,
      status: ExecutionStatus.scheduled,
      agent_id: agentId,
      execution_mode: executionMode,
      ...(interactivity ? { interactivity } : {}),
      parent_execution_id: parentExecutionId,
      space_id: spaceId,
      ...(owner ? { owner } : {}),
      agent_params: agentParams,
      event_count: 0,
      events: [],
      metadata: metadata ?? {},
    };

    await this.storage.getClient().index({
      id: executionId,
      document,
      op_type: 'create',
    });

    return fromEs(document);
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
    { error, abortReason }: UpdateExecutionStatusOptions = {}
  ): Promise<void> {
    // `aborted` is sticky: once an abort was requested the execution reports it. Neither a later
    // `failed` / `completed` (the graph ending inside the abort-detection window) nor a later
    // `running` (the abort landing between a handler's status read and its write) may overwrite
    // it — otherwise the abort monitor would see `running` and never cancel. The error, when
    // given, is still recorded.
    await this.esClient.update({
      index: agentExecutionIndexName,
      id: executionId,
      retry_on_conflict: UPDATE_RETRY_ON_CONFLICT,
      script: {
        lang: 'painless',
        source: `
          boolean keepAborted = ctx._source.status == 'aborted' && params.status != 'aborted';
          if (!keepAborted) { ctx._source.status = params.status; }
          if (params.error != null) { ctx._source.error = params.error; }
          if (params.abort_reason != null) { ctx._source.abort_reason = params.abort_reason; }
        `,
        params: { status, error: error ?? null, abort_reason: abortReason ?? null },
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
      retry_on_conflict: UPDATE_RETRY_ON_CONFLICT,
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

  async updateHeartbeat(executionId: string): Promise<void> {
    await this.esClient.update({
      index: agentExecutionIndexName,
      id: executionId,
      retry_on_conflict: UPDATE_RETRY_ON_CONFLICT,
      doc: {
        last_heartbeat: new Date().toISOString(),
      },
    });
  }

  async peek(executionId: string): Promise<ExecutionPeek | undefined> {
    try {
      const response = await this.esClient.get<AgentExecutionProperties>({
        index: agentExecutionIndexName,
        id: executionId,
        _source_includes: [
          'status',
          'error',
          'event_count',
          'last_heartbeat',
          'agent_params.conversationId',
          'owner',
        ] as string[],
      });
      const source = response._source;
      if (!source) {
        return undefined;
      }
      const { agent_params: agentParams, owner } = source;
      const conversationId =
        agentParams && 'conversationId' in agentParams ? agentParams.conversationId : undefined;
      return {
        status: source.status,
        eventCount: source.event_count ?? 0,
        ...(source.error ? { error: source.error } : {}),
        ...(source.last_heartbeat ? { lastHeartbeat: source.last_heartbeat } : {}),
        ...(conversationId ? { conversationId } : {}),
        ...(owner ? { owner } : {}),
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

  async find(options: FindExecutionsOptions): Promise<AgentExecution[]> {
    const {
      spaceId,
      filter = {},
      size = 10,
      sort = { field: '@timestamp', order: 'desc' },
    } = options;

    if (!spaceId) {
      throw new Error('findExecutions requires a spaceId');
    }

    const must: QueryDslQueryContainer[] = [{ term: { space_id: spaceId } }];

    if (filter.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        must.push({ term: { [`metadata.${key}`]: value } });
      }
    }

    if (filter.status?.length) {
      must.push({ terms: { status: filter.status } });
    }

    try {
      const response = await this.esClient.search<AgentExecutionProperties>({
        index: agentExecutionIndexName,
        size,
        sort: [{ [sort.field]: { order: sort.order } }],
        _source_excludes: ['events'],
        query: { bool: { must } },
      });

      return response.hits.hits.flatMap((hit) => (hit._source ? [fromEs(hit._source)] : []));
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return [];
      }
      throw err;
    }
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
