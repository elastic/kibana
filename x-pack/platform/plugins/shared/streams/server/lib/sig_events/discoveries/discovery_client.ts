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

  async findLatestPerSlug(options: DiscoveriesSearchOptions = {}): Promise<{ hits: Discovery[] }> {
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
