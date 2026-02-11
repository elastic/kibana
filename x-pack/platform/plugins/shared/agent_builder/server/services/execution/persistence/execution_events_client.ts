/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { AgentExecutionEventDoc } from '../types';
import type {
  ExecutionEventsDataStreamClient,
  ExecutionEventDocument,
} from './execution_events_storage';
import { initializeExecutionEventsDataStreamClient } from './execution_events_storage';

/**
 * Client for reading and writing agent execution events.
 */
export interface ExecutionEventsClient {
  /**
   * Write events to the data stream.
   */
  writeEvents(events: AgentExecutionEventDoc[]): Promise<void>;

  /**
   * Read events for a given execution.
   * @param executionId - The execution to read events for.
   * @param since - If provided, only return events with event_number strictly greater than this value.
   */
  readEvents(executionId: string, since?: number): Promise<AgentExecutionEventDoc[]>;
}

export const createExecutionEventsClient = ({
  dataStreams,
}: {
  dataStreams: DataStreamsStart;
}): ExecutionEventsClient => {
  return new ExecutionEventsClientImpl({ dataStreams });
};

class ExecutionEventsClientImpl implements ExecutionEventsClient {
  private readonly dataStreams: DataStreamsStart;
  private clientPromise: Promise<ExecutionEventsDataStreamClient> | undefined;

  constructor({ dataStreams }: { dataStreams: DataStreamsStart }) {
    this.dataStreams = dataStreams;
  }

  private getClient(): Promise<ExecutionEventsDataStreamClient> {
    if (!this.clientPromise) {
      this.clientPromise = initializeExecutionEventsDataStreamClient(this.dataStreams);
    }
    return this.clientPromise;
  }

  async writeEvents(events: AgentExecutionEventDoc[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const client = await this.getClient();
    const documents: ExecutionEventDocument[] = events.map((event) => ({
      '@timestamp': event['@timestamp'],
      agent_execution_id: event.agentExecutionId,
      event_number: event.eventNumber,
      agent_id: event.agentId,
      space_id: event.spaceId,
      event: event.event,
    }));

    // force refresh to have the events available as soon as possible for search
    await client.create({ documents, refresh: true });
  }

  async readEvents(executionId: string, since?: number): Promise<AgentExecutionEventDoc[]> {
    const client = await this.getClient();

    const filters: Array<Record<string, unknown>> = [{ term: { agent_execution_id: executionId } }];

    if (since !== undefined) {
      filters.push({ range: { event_number: { gt: since } } });
    }

    const response = await client.search({
      size: 1000,
      query: {
        bool: {
          filter: filters,
        },
      },
      sort: [{ event_number: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => {
      const source = hit._source!;
      return {
        '@timestamp': source['@timestamp'],
        agentExecutionId: source.agent_execution_id,
        eventNumber: source.event_number,
        agentId: source.agent_id,
        spaceId: source.space_id,
        event: source.event,
      };
    });
  }
}
