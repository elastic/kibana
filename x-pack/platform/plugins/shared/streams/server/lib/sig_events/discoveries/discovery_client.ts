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
  runFindByIdsEsqlQuery,
  queryEsql,
  esqlToObjects,
} from '../latest_source_query';
import {
  DISCOVERIES_DATA_STREAM,
  type Discovery,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';
import {
  FIELD_DISCOVERY_ID,
  FIELD_DISCOVERY_SLUG,
  FIELD_CLOSES_DISCOVERY_ID,
} from '../field_names';

export type DiscoveryDataStreamClient = IDataStreamClient<
  typeof discoveriesMappings,
  StoredDiscovery
>;

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
      groupBy: FIELD_DISCOVERY_ID,
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
      groupBy: FIELD_DISCOVERY_ID,
      where: esql.exp`${esql.col('kind')} == ${esql.str('finding')}`,
    });

    if (!result.hits.length) return result;

    const clearedIds = await this.getClearedIds(
      result.hits.map((h) => h.discovery_id).filter((id): id is string => Boolean(id))
    );

    return {
      ...result,
      hits: result.hits.map((h) => ({
        ...h,
        kind: clearedIds.has(h.discovery_id ?? '') ? ('clearance' as const) : h.kind,
      })),
    };
  }

  // Returns the set of finding IDs that have been cleared, querying by closes_discovery_id —
  // the field the workflow writes on clearance docs, consistent with how verdict checks clearances.
  private async getClearedIds(findingIds: string[]): Promise<Set<string>> {
    if (!findingIds.length) return new Set();
    const idLiterals = findingIds.map((id) => esql.str(id));
    const query = esql`FROM ${DISCOVERIES_DATA_STREAM}
      | WHERE ${esql.col('kibana.space_ids')} == ${esql.str(this.clients.space)} OR ${esql.col(
      'kibana.space_ids'
    )} IS NULL
      | WHERE ${esql.col('kind')} == ${esql.str('clearance')}
      | WHERE ${esql.col('closes_discovery_id')} IN (${idLiterals})
      | KEEP ${esql.col('closes_discovery_id')}`;
    const response = await queryEsql({ esClient: this.clients.esClient, query });
    const rows = esqlToObjects<{ closes_discovery_id: string }>(response);
    return new Set(rows.map((r) => r.closes_discovery_id));
  }

  async findById(discoveryId: string): Promise<{ hits: Discovery[] }> {
    return runFindByIdEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_DISCOVERY_ID,
      idValue: discoveryId,
    });
  }

  async findByIds(discoveryIds: string[]): Promise<{ hits: Discovery[] }> {
    return runFindByIdsEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_DISCOVERY_ID,
      idValues: discoveryIds,
    });
  }

  async findByClosesDiscoveryId(discoveryId: string): Promise<{ hits: Discovery[] }> {
    return runFindByIdEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_CLOSES_DISCOVERY_ID,
      idValue: discoveryId,
    });
  }

  async findBySlug(slug: string): Promise<{ hits: Discovery[] }> {
    return runFindByIdEsqlQuery<Discovery>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_DISCOVERY_SLUG,
      idValue: slug,
    });
  }
}
