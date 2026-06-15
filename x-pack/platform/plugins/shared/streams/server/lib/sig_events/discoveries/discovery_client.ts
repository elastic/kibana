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
      groupBy: FIELD_DISCOVERY_SLUG,
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
      groupBy: FIELD_DISCOVERY_SLUG,
      where: esql.exp`${esql.col('kind')} == ${esql.str('discovery')}`,
    });

    if (!result.hits.length) return result;

    const slugs = result.hits
      .map((h) => h.discovery_slug)
      .filter((slug): slug is string => Boolean(slug));

    const clearedSlugs = await this.getClearedSlugs(slugs);

    return {
      ...result,
      hits: result.hits.map((h) => ({
        ...h,
        kind: clearedSlugs.has(h.discovery_slug ?? '') ? ('clearance' as const) : h.kind,
      })),
    };
  }

  // Returns the set of discovery slugs that have been cleared.
  // Identity is slug-stable (A1): an incident is one `discovery_slug`, so clearance is
  // derived per slug rather than per ephemeral `discovery_id`. Both finding and clearance
  // docs carry `discovery_slug`, so we group both kinds by it directly.
  // Mirrors getProcessedIds in detection_client: a slug is cleared only when the latest
  // clearance doc timestamp is on or after the latest finding doc timestamp, so a slug that
  // regrows after a clearance (newer finding, no newer clearance) is not reported as cleared.
  // Chunked at CLEARED_IDS_CHUNK_SIZE to match the getProcessedIds IN-clause guard.
  private async getClearedSlugs(slugs: string[]): Promise<Set<string>> {
    if (!slugs.length) return new Set();

    const cleared = new Set<string>();
    for (let i = 0; i < slugs.length; i += CLEARED_IDS_CHUNK_SIZE) {
      const batch = slugs.slice(i, i + CLEARED_IDS_CHUNK_SIZE);
      const slugLiterals = batch.map((slug) => esql.str(slug));
      const kindFinding = esql.str('discovery');
      const kindClearance = esql.str('clearance');
      // Group both doc kinds by `discovery_slug` (the incident identity under A1):
      // finding docs and clearance docs both carry the slug for the incident they belong to.
      const query = esql`FROM ${DISCOVERIES_DATA_STREAM}
        | WHERE ${esql.col('kibana.space_ids')} == ${esql.str(this.clients.space)} OR ${esql.col(
        'kibana.space_ids'
      )} IS NULL
        | WHERE ${esql.col('kind')} IN (${[kindFinding, kindClearance]})
        | WHERE ${esql.col('discovery_slug')} IN (${slugLiterals})
        | EVAL unified_id = ${esql.col('discovery_slug')}
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
