/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '../latest_source_query';
import {
  VERDICTS_DATA_STREAM,
  type StoredVerdict,
  type Verdict,
  type verdictsMappings,
} from './data_stream';
import { FIELD_DISCOVERY_ID, FIELD_DISCOVERY_SLUG } from '../field_names';
import { enrichFromEvidences } from '../utils';

export type VerdictDataStreamClient = IDataStreamClient<typeof verdictsMappings, StoredVerdict>;

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
      groupBy: FIELD_DISCOVERY_ID,
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
      groupBy: FIELD_DISCOVERY_ID,
    });

    return { ...result, hits: result.hits.map(enrichFromEvidences) };
  }

  async findByDiscoveryId(discoveryId: string): Promise<{ hits: Verdict[] }> {
    return runFindByIdEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: VERDICTS_DATA_STREAM,
      idField: FIELD_DISCOVERY_ID,
      idValue: discoveryId,
    });
  }

  async findByDiscoveryIds(discoveryIds: string[]): Promise<{ hits: Verdict[] }> {
    return runFindByIdsEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: VERDICTS_DATA_STREAM,
      idField: FIELD_DISCOVERY_ID,
      idValues: discoveryIds,
    });
  }

  async findByDiscoverySlug(slug: string): Promise<{ hits: Verdict[] }> {
    return runFindByIdEsqlQuery<Verdict>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: VERDICTS_DATA_STREAM,
      idField: FIELD_DISCOVERY_SLUG,
      idValue: slug,
    });
  }
}
