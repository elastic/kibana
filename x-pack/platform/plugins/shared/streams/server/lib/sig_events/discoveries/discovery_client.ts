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
import { FIELD_DISCOVERY_ID, FIELD_DISCOVERY_SLUG } from '../field_names';

const CLEARED_IDS_CHUNK_SIZE = 250;

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

  // Returns the set of finding IDs that have been cleared.
  // Mirrors getProcessedIds in detection_client: a finding is cleared only when the latest
  // clearance doc timestamp is on or after the latest finding doc timestamp, so re-opened
  // findings (no newer clearance) are not reported as cleared.
  // Chunked at CLEARED_IDS_CHUNK_SIZE to match the getProcessedIds IN-clause guard.
  private async getClearedIds(findingIds: string[]): Promise<Set<string>> {
    if (!findingIds.length) return new Set();

    const cleared = new Set<string>();
    for (let i = 0; i < findingIds.length; i += CLEARED_IDS_CHUNK_SIZE) {
      const batch = findingIds.slice(i, i + CLEARED_IDS_CHUNK_SIZE);
      const idLiterals = batch.map((id) => esql.str(id));
      const kindFinding = esql.str('finding');
      const kindClearance = esql.str('clearance');
      // Use EVAL to normalize both doc types to the same "finding ID" for grouping:
      // finding docs: unified_id = discovery_id
      // clearance docs: unified_id = closes_discovery_id (references the original finding)
      const query = esql`FROM ${DISCOVERIES_DATA_STREAM}
        | WHERE ${esql.col('kibana.space_ids')} == ${esql.str(this.clients.space)} OR ${esql.col(
        'kibana.space_ids'
      )} IS NULL
        | WHERE ${esql.col('kind')} IN (${[kindFinding, kindClearance]})
        | WHERE ${esql.col('discovery_id')} IN (${idLiterals}) OR ${esql.col(
        'closes_discovery_id'
      )} IN (${idLiterals})
        | EVAL unified_id = CASE(${esql.col('kind')} == ${kindFinding}, ${esql.col(
        'discovery_id'
      )}, ${esql.col('closes_discovery_id')})
        | STATS max_finding_ts = MAX(CASE(${esql.col('kind')} == ${kindFinding}, @timestamp, null)),
                max_clearance_ts = MAX(CASE(${esql.col(
                  'kind'
                )} == ${kindClearance}, @timestamp, null))
          BY unified_id
        | WHERE max_clearance_ts >= max_finding_ts OR max_finding_ts IS NULL
        | WHERE unified_id IS NOT NULL
        | KEEP unified_id`;
      const response = await queryEsql({ esClient: this.clients.esClient, query });
      const rows = esqlToObjects<{ unified_id: string }>(response);
      for (const r of rows) {
        if (r.unified_id) cleared.add(r.unified_id);
      }
    }
    return cleared;
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
