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
  DISCOVERIES_DATA_STREAM,
  type Discovery,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';

export type DiscoveryDataStreamClient = IDataStreamClient<
  typeof discoveriesMappings,
  StoredDiscovery
>;

export type DiscoverySort =
  | '@timestamp:asc'
  | '@timestamp:desc'
  | 'criticality:asc'
  | 'criticality:desc';

export interface DiscoveriesSearchOptions extends CommonSearchOptions {
  status?: string;
  discovery_id?: string[];
  exclude_discovery_id?: string[];
  exclude_grouped?: boolean;
  size?: number;
  sort?: DiscoverySort[];
}

const buildWhere = (options: DiscoveriesSearchOptions): LatestSourceWhereCondition | undefined => {
  let where: LatestSourceWhereCondition | undefined;

  if (options.status) {
    where = andWhere(where, esql.exp`${esql.col('status')} == ${esql.str(options.status)}`);
  }

  if (options.discovery_id?.length) {
    where = andWhere(where, inList('discovery_id', options.discovery_id));
  }

  if (options.exclude_discovery_id?.length) {
    where = andWhere(
      where,
      esql.exp`NOT (${inList('discovery_id', options.exclude_discovery_id)})`
    );
  }

  if (options.exclude_grouped) {
    where = andWhere(where, esql.exp`${esql.col('grouped_into')} IS NULL`);
  }

  return where;
};

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
    return runLatestSourceEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      where: buildWhere(options),
      sort: options.sort?.map(parseSort),
      limit: options.size,
      groupBy: 'discovery_id',
    });
  }

  async findLatestPerSlug(options: DiscoveriesSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    return runLatestSourceEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      where: buildWhere(options),
      sort: options.sort?.map(parseSort),
      limit: options.size,
      groupBy: 'discovery_slug',
    });
  }
}
