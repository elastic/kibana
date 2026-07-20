/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SignificantEvent, Severity } from '@kbn/significant-events-schema';
import {
  type BulkCreateOptions,
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
  throwOnBulkCreateErrors,
} from '../query_utils';
import {
  andWhere,
  applyTimeRange,
  executeCountQuery,
  fromIndexForSpace,
  inFilter,
  executeEsqlQuery,
  pickLatestPerGroup,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
  withSort,
  withWhere,
} from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  storedEventSchema,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';
import { FIELD_EVENT_UUID, FIELD_EVENT_ID } from '../field_names';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

export interface EventsFilterOptions {
  status?: SignificantEvent['status'][];
  severity?: Severity[];
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
    where = inFilter({ where, field: 'status', values: options.status });
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

  async bulkCreate(
    events: SignificantEvent[],
    { throwOnFail = false, refresh }: BulkCreateOptions = {}
  ) {
    const response = await this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: events.map((e) => storedEventSchema.parse(e)),
      refresh,
    });

    if (throwOnFail) {
      throwOnBulkCreateErrors(response);
    }

    return response;
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: SignificantEvent[] }> {
    const result = await runLatestSourceEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      groupBy: FIELD_EVENT_ID,
    });
    return { hits: result.hits };
  }

  async findLatestPaginated(
    options: EventsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SignificantEvent>> {
    const result = await runPaginatedLatestSourceEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_EVENT_ID,
    });

    return result;
  }

  async findLatestByCurrentStatePaginated(
    options: EventsPaginatedSearchOptions
  ): Promise<PaginatedResponse<SignificantEvent>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 25;

    const statusWhere = options.status
      ? esql.exp`${esql.col('status')} IN (${options.status.map((s) => esql.str(s))})`
      : undefined;

    const severityWhere = options.severity
      ? esql.exp`${esql.col('severity')} IN (${options.severity.map((s) => esql.str(s))})`
      : undefined;

    // ComposerQuery is mutable — each chaining call mutates the same object and returns `this`.
    // Build the base query twice via a factory so the data branch and count branch get independent
    // instances; sharing a single reference causes the count pipeline to corrupt the data query.
    const buildBase = () => {
      let q = applyTimeRange({
        query: fromIndexForSpace({
          index: EVENTS_DATA_STREAM,
          space: this.clients.space,
          columns: ['_id', '_source'],
        }),
        from: options.from,
        to: options.to,
      });
      // stream + search filters run pre-latest; status + severity filters run post-latest
      q = withWhere(q, this.buildWhere({ stream: options.stream, search: options.search }));
      q = pickLatestPerGroup(q, FIELD_EVENT_ID);
      q = withWhere(q, statusWhere);
      q = withWhere(q, severityWhere);
      return q;
    };

    const sortArgs: ComposerSortShorthand[] = [['@timestamp', 'DESC']];
    const dataQuery = withSort(buildBase(), sortArgs)
      .limit(page * perPage)
      .keep('_source');
    const countQuery = buildBase().pipe`STATS total = COUNT(*)`.keep('total');

    const [total, hits] = await Promise.all([
      executeCountQuery({ esClient: this.clients.esClient, query: countQuery }),
      executeEsqlQuery<SignificantEvent>({ esClient: this.clients.esClient, query: dataQuery }),
    ]);

    const start = (page - 1) * perPage;
    const paginatedHits = start >= hits.length ? [] : hits.slice(start, start + perPage);

    return {
      hits: paginatedHits,
      page,
      perPage,
      total,
    };
  }

  async findByEventUuid(id: string): Promise<{ hits: SignificantEvent[] }> {
    const result = await runFindByIdEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: FIELD_EVENT_UUID,
      idValue: id,
    });
    return { hits: result.hits };
  }

  async findByEventId(eventId: string): Promise<{ hits: SignificantEvent[] }> {
    const result = await runFindByIdEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: FIELD_EVENT_ID,
      idValue: eventId,
    });
    return { hits: result.hits };
  }

  async findLatestByEventIds(eventIds: string[]): Promise<Map<string, SignificantEvent>> {
    if (!eventIds.length) return new Map();
    const idLiterals = eventIds.map((s) => esql.str(s));
    const where = esql.exp`${esql.col(FIELD_EVENT_ID)} IN (${idLiterals})`;
    const { hits } = await runPaginatedLatestSourceEsqlQuery<SignificantEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options: { perPage: eventIds.length },
      index: EVENTS_DATA_STREAM,
      where,
      groupBy: FIELD_EVENT_ID,
    });
    const map = new Map<string, SignificantEvent>();
    for (const event of hits) {
      if (event.event_id) map.set(event.event_id, event);
    }
    return map;
  }
}
