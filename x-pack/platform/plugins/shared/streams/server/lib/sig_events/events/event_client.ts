/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  type LatestSourceWhereCondition,
  andWhere,
  inFilter,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
  queryEsql,
} from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  type SigEvent,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

export interface EventsFilterOptions {
  verdict?: string[];
  stream?: string[];
  impact?: string[];
  search?: string;
}

export interface EventsPaginatedSearchOptions extends PaginatedSearchOptions, EventsFilterOptions {}

const GROUP_BY_FIELD = 'event_id';

export class EventClient {
  constructor(
    private readonly clients: {
      dataStreamClient: EventDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  private buildWhere(options: EventsFilterOptions): LatestSourceWhereCondition | undefined {
    let where: LatestSourceWhereCondition | undefined;
    where = inFilter({ where, field: 'verdict', values: options.verdict });
    where = inFilter({ where, field: 'stream_names', values: options.stream });
    where = inFilter({ where, field: 'impact', values: options.impact });

    if (options.search) {
      const escaped = options.search.toLowerCase().replace(/[*?]/g, '\\$&');
      where = andWhere(
        where,
        esql.exp`TO_LOWER(${esql.col('title')}) LIKE ${esql.str(`*${escaped}*`)}`
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
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findLatestPaginated(
    options: EventsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SigEvent>> {
    const supersededIds = await this.findSupersededEventIds();

    let where = this.buildWhere(options);
    if (supersededIds.size > 0) {
      const literals = [...supersededIds].map((id) => esql.str(id));
      where = andWhere(where, esql.exp`NOT ${esql.col('event_id')} IN (${literals})`);
    }

    return runPaginatedLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      where,
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

  async findSupersededEventIds(): Promise<Set<string>> {
    const { space } = this.clients;
    const prevId = esql.col('previous_event_id');

    const query = esql.from([EVENTS_DATA_STREAM]).where`${esql.col(
      'kibana.space_ids'
    )} == ${space} OR ${esql.col('kibana.space_ids')} IS NULL`
      .where`${prevId} IS NOT NULL AND ${prevId} != ${esql.str('')}`
      .pipe`STATS ids = VALUES(${prevId})`.keep('ids');

    try {
      const response = await queryEsql({
        esClient: this.clients.esClient,
        query,
      });

      const idsIdx = response.columns.findIndex((c) => c.name === 'ids');
      if (idsIdx === -1 || response.values.length === 0) {
        return new Set();
      }

      const rawValue = response.values[0][idsIdx];
      const ids = Array.isArray(rawValue) ? rawValue : [rawValue];
      return new Set(ids.filter((v): v is string => typeof v === 'string'));
    } catch {
      return new Set();
    }
  }
}
