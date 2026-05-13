/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import type { verdictEnum } from '@kbn/streams-schema';
import {
  type CommonSearchOptions,
  type TimestampSort,
  applyTimeWindow,
  collapseToLatest,
  inList,
  parseSort,
} from '../query_utils';
import { baseSpaceScopedQuery, executeSourceQuery } from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  type SigEvent,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

export type EventSort = TimestampSort | 'last_reviewed_at:asc' | 'last_reviewed_at:desc';

export type EventVerdictValue = z.infer<typeof verdictEnum>;

export interface EventsSearchOptions extends CommonSearchOptions {
  verdict?: EventVerdictValue[];
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
    let query = baseSpaceScopedQuery(EVENTS_DATA_STREAM, this.clients.space);

    query = applyTimeWindow(query, options);

    if (options.slug?.length) {
      query = query.where`${inList('discovery_slug', options.slug)}`;
    }
    if (options.exclude_slug?.length) {
      query = query.where`NOT (${inList('discovery_slug', options.exclude_slug)})`;
    }

    query = collapseToLatest(query, 'event_id');

    if (options.verdict?.length) {
      query = query.where`${inList('verdict', options.verdict)}`;
    }
    if (options.discovery_id?.length) {
      query = query.where`${inList('discovery_id', options.discovery_id)}`;
    }
    if (options.exclude_grouped) {
      query = query.where`${esql.col('grouped_into')} IS NULL`;
    }

    const { last_reviewed_before: before, or_last_reviewed_lte: lte } = options;
    if (before && lte) {
      query = query.where`(${esql.col('last_reviewed_at')} < TO_DATETIME(${esql.str(
        before
      )}) OR ${esql.col('last_reviewed_at')} <= TO_DATETIME(${esql.str(lte)}))`;
    } else if (before) {
      query = query.where`${esql.col('last_reviewed_at')} < TO_DATETIME(${esql.str(before)})`;
    } else if (lte) {
      query = query.where`${esql.col('last_reviewed_at')} <= TO_DATETIME(${esql.str(lte)})`;
    }

    if (options.sort?.length) {
      const sort = options.sort.map(parseSort);
      query = query.sort(sort[0], ...sort.slice(1));
    }
    query = query.keep('_source');
    if (options.size !== undefined) {
      query = query.limit(options.size);
    }

    return executeSourceQuery<SigEvent>(this.clients.esClient, query);
  }
}
