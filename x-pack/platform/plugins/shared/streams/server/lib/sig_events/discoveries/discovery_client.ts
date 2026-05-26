/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
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
  queryEsql,
  esqlToObjects,
} from '../latest_source_query';
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

const GROUP_BY_FIELD = 'discovery_slug';

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

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    return runLatestSourceEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findLatestPaginated(
    options: PaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<Discovery>> {
    const result = await runPaginatedLatestSourceEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });

    if (result.hits.length === 0) return result;

    const discoveredAtMap = await this.getDiscoveredAtMap(options);
    return {
      ...result,
      hits: result.hits.map((h) => ({
        ...h,
        discovered_at: discoveredAtMap.get(h.discovery_slug) ?? h['@timestamp'],
      })),
    };
  }

  // Returns MIN(@timestamp) of kind:finding documents per discovery_slug for the given time range.
  // A finding always precedes any clearance for the same slug, so MIN(@timestamp) = first investigation time.
  private async getDiscoveredAtMap(options: CommonSearchOptions): Promise<Map<string, string>> {
    try {
      let query = esql.from([DISCOVERIES_DATA_STREAM]).where`${esql.col('kibana.space_ids')} == ${
        this.clients.space
      } OR ${esql.col('kibana.space_ids')} IS NULL`;

      if (options.from !== undefined) {
        query = query.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
      }
      if (options.to !== undefined) {
        query = query.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
      }

      query = query.where`${esql.col('kind')} == ${esql.str('finding')}`;
      query = query.pipe`STATS discovered_at = MIN(@timestamp) BY ${esql.col('discovery_slug')}`;

      const response = await queryEsql({ esClient: this.clients.esClient, query: query.print() });
      const rows = esqlToObjects<{ discovery_slug: string; discovered_at: string }>(response);
      return new Map(rows.map((r) => [r.discovery_slug, r.discovered_at]));
    } catch (error) {
      return new Map();
    }
  }

  async findBySlug(slug: string): Promise<{ hits: Discovery[] }> {
    return runFindByIdEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: 'discovery_slug',
      idValue: slug,
    });
  }
}
