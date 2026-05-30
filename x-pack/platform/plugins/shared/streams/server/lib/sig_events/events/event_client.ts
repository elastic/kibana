/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  andWhere,
  inFilter,
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
import { FIELD_EVENT_ID, FIELD_DISCOVERY_SLUG } from '../field_names';
import { enrichFromEvidences } from '../utils';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

export interface EventsFilterOptions {
  verdict?: string[];
  stream?: string[];
  search?: string;
}

export interface EventsPaginatedSearchOptions extends PaginatedSearchOptions, EventsFilterOptions {}

export class EventClient {
  constructor(
    private readonly clients: {
      dataStreamClient: EventDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  private buildWhere(options: EventsFilterOptions): ESQLAstExpression | undefined {
    let where: ESQLAstExpression | undefined;
    where = inFilter({ where, field: 'verdict', values: options.verdict });
    where = inFilter({ where, field: 'stream_names', values: options.stream });

    if (options.search) {
      const escaped = options.search.toLowerCase().replace(/\\/g, '\\\\').replace(/[*?]/g, '\\$&');
      const pattern = esql.str(`*${escaped}*`);
      where = andWhere(
        where,
        esql.exp`(TO_LOWER(${esql.col('title')}) LIKE ${pattern} OR TO_LOWER(${esql.col(
          'summary'
        )}) LIKE ${pattern})`
      );
    }

    return where;
  }

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
      groupBy: FIELD_DISCOVERY_SLUG,
    });
  }

  async findLatestPaginated(
    options: EventsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SigEvent>> {
    const result = await runPaginatedLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_DISCOVERY_SLUG,
    });

    return { ...result, hits: result.hits.map(enrichFromEvidences) };
  }

  async findById(id: string): Promise<{ hits: SigEvent[] }> {
    return runFindByIdEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: FIELD_EVENT_ID,
      idValue: id,
    });
  }

  async findByDiscoverySlug(slug: string): Promise<{ hits: SigEvent[] }> {
    return runFindByIdEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: FIELD_DISCOVERY_SLUG,
      idValue: slug,
    });
  }
}
