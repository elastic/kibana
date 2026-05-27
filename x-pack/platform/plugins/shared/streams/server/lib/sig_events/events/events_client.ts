/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLAstExpression } from '@elastic/esql/types';
import {
  type CommonSearchOptions,
  type PaginationSearchOptions,
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

export type EventsDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

const GROUP_BY_FIELD = 'event_id';

export interface EventsSearchOptions extends CommonSearchOptions {
  searchQuery?: string;
}

export type EventsPaginatedSearchOptions = EventsSearchOptions & PaginationSearchOptions;

export class EventsClient {
  constructor(
    private readonly clients: {
      dataStreamClient: EventsDataStreamClient;
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

  async findLatest(options: EventsSearchOptions = {}): Promise<{ hits: SigEvent[] }> {
    return runLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findLatestPaginated(
    options: EventsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SigEvent>> {
    return runPaginatedLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      where: this.buildWhere(options),
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

  private buildWhere({ searchQuery }: EventsSearchOptions): ESQLAstExpression | undefined {
    let where: ESQLAstExpression | undefined;

    if (searchQuery !== undefined && searchQuery.trim() !== '') {
      where = esql.exp(
        `MATCH(${esql.col('title')}, ${esql.str(searchQuery)}) OR MATCH(${esql.col(
          'summary'
        )}, ${esql.str(searchQuery)})`
      );
    }

    return where;
  }
}
