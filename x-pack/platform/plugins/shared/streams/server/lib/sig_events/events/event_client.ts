/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
} from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  type SigEvent,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

const GROUP_BY_FIELD = 'event_id';

export class EventClient {
  constructor(
    private readonly clients: {
      dataStreamClient: EventDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(events: SigEvent[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: events,
    });
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: SigEvent[] }> {
    return runLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findLatestPaginated(
    options: PaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SigEvent>> {
    return runPaginatedLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findById(eventId: string): Promise<{ hits: SigEvent[] }> {
    return runFindByIdEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: GROUP_BY_FIELD,
      idValue: eventId,
    });
  }
}
