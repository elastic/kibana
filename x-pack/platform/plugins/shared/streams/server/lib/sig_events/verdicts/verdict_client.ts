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
  type LatestSourceWhereCondition,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
} from '../latest_source_query';
import {
  VERDICTS_DATA_STREAM,
  type StoredVerdict,
  type Verdict,
  type verdictsMappings,
} from './data_stream';
import { DISCOVERIES_DATA_STREAM, type Discovery } from '../discoveries/data_stream';

export type VerdictDataStreamClient = IDataStreamClient<typeof verdictsMappings, StoredVerdict>;

const GROUP_BY_FIELD = 'discovery_slug';
const STREAMS_MAP_CHUNK_SIZE = 250;

export class VerdictClient {
  constructor(
    private readonly clients: {
      dataStreamClient: VerdictDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(verdicts: Verdict[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: verdicts,
    });
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: Verdict[] }> {
    return runLatestSourceEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: VERDICTS_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findLatestPaginated(
    options: PaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<Verdict>> {
    const result = await runPaginatedLatestSourceEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: VERDICTS_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });

    if (result.hits.length === 0) return result;

    const slugsMissingStreams = result.hits
      .filter((v) => !v.stream_names?.length && !v.evidences?.some((e) => e.stream_name))
      .map((v) => v.discovery_slug);

    if (slugsMissingStreams.length === 0) return result;

    const streamsMap = await this.getDiscoveryStreamsMap(slugsMissingStreams);
    return {
      ...result,
      hits: result.hits.map((v) => {
        const derived = streamsMap.get(v.discovery_slug);
        if (!derived?.length) return v;
        return { ...v, stream_names: derived };
      }),
    };
  }

  // Fetches the latest kind:finding per discovery_slug via ES|QL and extracts stream names.
  // Chunked to avoid oversized IN clauses. Mirrors detection_client.getProcessedIds chunking.
  private async getDiscoveryStreamsMap(slugs: string[]): Promise<Map<string, string[]>> {
    if (!slugs.length) return new Map();

    const map = new Map<string, string[]>();
    for (let i = 0; i < slugs.length; i += STREAMS_MAP_CHUNK_SIZE) {
      const batch = slugs.slice(i, i + STREAMS_MAP_CHUNK_SIZE);
      await this.getDiscoveryStreamsMapBatch(batch, map);
    }
    return map;
  }

  private async getDiscoveryStreamsMapBatch(
    slugs: string[],
    map: Map<string, string[]>
  ): Promise<void> {
    try {
      const slugLiterals = slugs.map((s) => esql.str(s));
      const where: LatestSourceWhereCondition = esql.exp`${esql.col('kind')} == ${esql.str(
        'finding'
      )} AND ${esql.col('discovery_slug')} IN (${slugLiterals})`;

      const result = await runLatestSourceEsqlQuery<Discovery>({
        esClient: this.clients.esClient,
        space: this.clients.space,
        options: {},
        index: DISCOVERIES_DATA_STREAM,
        where,
        groupBy: GROUP_BY_FIELD,
      });

      for (const doc of result.hits) {
        const names = [
          ...new Set(
            (doc.detections ?? []).map((d) => d.stream_name).filter((s): s is string => !!s)
          ),
        ];
        if (names.length > 0) map.set(doc.discovery_slug, names);
      }
    } catch (error) {
      // Non-fatal: return partial results already accumulated in map.
    }
  }

  async findByDiscoverySlug(slug: string): Promise<{ hits: Verdict[] }> {
    return runFindByIdEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: VERDICTS_DATA_STREAM,
      idField: 'discovery_slug',
      idValue: slug,
    });
  }
}
