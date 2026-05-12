/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions, andWhere, inList, parseSort } from '../query_utils';
import { type LatestSourceWhereCondition, runLatestSourceEsqlQuery } from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  type SigEvent,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

export type EventSort =
  | '@timestamp:asc'
  | '@timestamp:desc'
  | 'last_reviewed_at:asc'
  | 'last_reviewed_at:desc';

export interface EventsSearchOptions extends CommonSearchOptions {
  verdict?: string[];
  slug?: string[];
  exclude_slug?: string[];
  discovery_id?: string[];
  exclude_grouped?: boolean;
  /** ISO 8601 datetime; strict less-than against `last_reviewed_at`. */
  last_reviewed_before?: string;
  /**
   * ISO 8601 datetime; when combined with {@link last_reviewed_before} produces
   * `(last_reviewed_at < before OR last_reviewed_at <= lte)`. When only this
   * field is set, produces `last_reviewed_at <= lte`.
   */
  or_last_reviewed_lte?: string;
  size?: number;
  sort?: EventSort[];
}

const buildWhere = (options: EventsSearchOptions): LatestSourceWhereCondition | undefined => {
  let where: LatestSourceWhereCondition | undefined;

  if (options.verdict?.length) {
    where = andWhere(where, inList('verdict', options.verdict));
  }

  if (options.slug?.length) {
    where = andWhere(where, inList('discovery_slug', options.slug));
  }

  if (options.exclude_slug?.length) {
    where = andWhere(where, esql.exp`NOT (${inList('discovery_slug', options.exclude_slug)})`);
  }

  if (options.discovery_id?.length) {
    where = andWhere(where, inList('discovery_id', options.discovery_id));
  }

  if (options.exclude_grouped) {
    where = andWhere(where, esql.exp`${esql.col('grouped_into')} IS NULL`);
  }

  const { last_reviewed_before: before, or_last_reviewed_lte: lte } = options;

  if (before && lte) {
    where = andWhere(
      where,
      esql.exp`(${esql.col('last_reviewed_at')} < TO_DATETIME(${esql.str(before)}) OR ${esql.col(
        'last_reviewed_at'
      )} <= TO_DATETIME(${esql.str(lte)}))`
    );
  } else if (before) {
    where = andWhere(
      where,
      esql.exp`${esql.col('last_reviewed_at')} < TO_DATETIME(${esql.str(before)})`
    );
  } else if (lte) {
    where = andWhere(
      where,
      esql.exp`${esql.col('last_reviewed_at')} <= TO_DATETIME(${esql.str(lte)})`
    );
  }

  return where;
};

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

  async findLatest(options: EventsSearchOptions = {}): Promise<{ hits: SigEvent[] }> {
    return runLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      where: buildWhere(options),
      sort: options.sort?.map(parseSort),
      limit: options.size,
      groupBy: 'event_id',
    });
  }
}
