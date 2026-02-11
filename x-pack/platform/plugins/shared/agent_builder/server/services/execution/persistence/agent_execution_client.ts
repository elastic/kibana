/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { AgentExecution, AgentExecutionParams, SerializedExecutionError } from '../types';
import { ExecutionStatus } from '../types';
import type { AgentExecutionProperties, AgentExecutionStorage } from './agent_execution_storage';
import { createStorage } from './agent_execution_storage';

type Document = SearchHit<AgentExecutionProperties>;

const fromEs = (doc: Document): AgentExecution => {
  const source = doc._source!;
  return {
    executionId: source.execution_id,
    '@timestamp': source['@timestamp'],
    status: source.status,
    agentId: source.agent_id,
    spaceId: source.space_id,
    agentParams: source.agent_params,
    ...(source.error ? { error: source.error } : {}),
  };
};

/**
 * Client for agent execution documents.
 */
export interface AgentExecutionClient {
  /** Create a new execution document. */
  create(execution: {
    executionId: string;
    agentId: string;
    spaceId: string;
    agentParams: AgentExecutionParams;
  }): Promise<AgentExecution>;

  /** Get an execution document by id. Returns undefined if not found. */
  get(executionId: string): Promise<AgentExecution | undefined>;

  /** Update the status of an execution, optionally persisting an error. */
  updateStatus(
    executionId: string,
    status: ExecutionStatus,
    error?: SerializedExecutionError
  ): Promise<void>;
}

export const createAgentExecutionClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentExecutionClient => {
  const storage = createStorage({ logger, esClient });
  return new AgentExecutionClientImpl({ storage });
};

class AgentExecutionClientImpl implements AgentExecutionClient {
  private readonly storage: AgentExecutionStorage;

  constructor({ storage }: { storage: AgentExecutionStorage }) {
    this.storage = storage;
  }

  async create({
    executionId,
    agentId,
    spaceId,
    agentParams,
  }: {
    executionId: string;
    agentId: string;
    spaceId: string;
    agentParams: AgentExecutionParams;
  }): Promise<AgentExecution> {
    const now = new Date().toISOString();
    const document: AgentExecutionProperties = {
      execution_id: executionId,
      '@timestamp': now,
      status: ExecutionStatus.scheduled,
      agent_id: agentId,
      space_id: spaceId,
      agent_params: agentParams,
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
    };
  }

  async get(executionId: string): Promise<AgentExecution | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [{ term: { _id: executionId } }],
        },
      },
    });

    if (response.hits.hits.length === 0) {
      return undefined;
    }

    return fromEs(response.hits.hits[0] as Document);
  }

  async updateStatus(
    executionId: string,
    status: ExecutionStatus,
    error?: SerializedExecutionError
  ): Promise<void> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [{ term: { _id: executionId } }],
        },
      },
    });

    const hit = response.hits.hits[0] as Document | undefined;
    if (!hit?._source) {
      throw new Error(`Execution ${executionId} not found`);
    }

    await this.storage.getClient().index({
      id: executionId,
      document: {
        ...hit._source,
        status,
        ...(error ? { error } : {}),
      },
    });
  }
}
