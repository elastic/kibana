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
  type TimestampSort,
  applyFilter,
  applyTimeWindow,
  collapseToLatest,
  inList,
  parseSort,
} from '../query_utils';
import { baseSpaceScopedQuery, executeSourceQuery } from '../latest_source_query';
import {
  DISCOVERIES_DATA_STREAM,
  type Discovery,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';

export type DiscoveryDataStreamClient = IDataStreamClient<
  typeof discoveriesMappings,
  StoredDiscovery
>;

export type DiscoverySort = TimestampSort | 'criticality:asc' | 'criticality:desc';

export type DiscoveryKind = Discovery['kind'];

export interface DiscoveriesSearchOptions extends CommonSearchOptions {
  kind?: DiscoveryKind;
  discovery_id?: string[];
  exclude_discovery_id?: string[];
  exclude_grouped?: boolean;
  size?: number;
  sort?: DiscoverySort[];
}

export class DiscoveryClient {
  constructor(
    private readonly clients: {
      dataStreamClient: DiscoveryDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(discoveries: Discovery[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: discoveries,
    });
  }

  /**
   * Returns the latest discovery matching the provided filters, per
   * `discovery_id`.
   *
   * Pipeline: apply filters → collapse to the most recent row per id.
   *
   * Semantically: "for each discovery, was there ever a matching row, and if
   * so which is the most recent?" Contrast with {@link findCurrentPerSlug},
   * which collapses first and may omit slugs whose current discovery does not
   * match.
   */
  async findLatest(options: DiscoveriesSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    let query = baseSpaceScopedQuery(DISCOVERIES_DATA_STREAM, this.clients.space);

    query = applyTimeWindow(query, options);

    query = applyFilter({ query, options, key: 'kind' });
    query = applyFilter({ query, options, key: 'discovery_id' });
    if (options.exclude_discovery_id?.length) {
      query = query.where`NOT (${inList('discovery_id', options.exclude_discovery_id)})`;
    }
    if (options.exclude_grouped) {
      query = query.where`${esql.col('grouped_into')} IS NULL`;
    }

    query = collapseToLatest(query, 'discovery_id');

    if (options.sort?.length) {
      const sort = options.sort.map(parseSort);
      query = query.sort(sort[0], ...sort.slice(1));
    }
    query = query.keep('_source');
    if (options.size !== undefined) {
      query = query.limit(options.size);
    }

    return executeSourceQuery<Discovery>(this.clients.esClient, query);
  }

  /**
   * Returns the current discovery per `discovery_slug`, then drops slugs whose
   * current discovery does not match the provided filters.
   *
   * Pipeline: collapse to the most recent row per slug → apply filters.
   *
   * Semantically: "what is the current discovery of each slug, and does it
   * match the filters?" A slug whose latest discovery does not match is
   * omitted, even if older matching discoveries exist. Contrast with
   * {@link findLatest}, which filters first and returns the latest *matching*
   * discovery per `discovery_id`.
   */
  async findCurrentPerSlug(options: DiscoveriesSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    let query = baseSpaceScopedQuery(DISCOVERIES_DATA_STREAM, this.clients.space);

    query = applyTimeWindow(query, options);

    query = collapseToLatest(query, 'discovery_slug');

    query = applyFilter({ query, options, key: 'kind' });
    query = applyFilter({ query, options, key: 'discovery_id' });
    if (options.exclude_discovery_id?.length) {
      query = query.where`NOT (${inList('discovery_id', options.exclude_discovery_id)})`;
    }
    if (options.exclude_grouped) {
      query = query.where`${esql.col('grouped_into')} IS NULL`;
    }

    if (options.sort?.length) {
      const sort = options.sort.map(parseSort);
      query = query.sort(sort[0], ...sort.slice(1));
    }
    query = query.keep('_source');
    if (options.size !== undefined) {
      query = query.limit(options.size);
    }

    return executeSourceQuery<Discovery>(this.clients.esClient, query);
  }
}
