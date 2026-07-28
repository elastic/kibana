/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { Discovery } from '@kbn/significant-events-schema';
import {
  type BulkCreateOptions,
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
  throwOnBulkCreateErrors,
} from '../query_utils';
import {
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
  runFindByIdsEsqlQuery,
  runGetProcessedIds,
} from '../latest_source_query';
import {
  DISCOVERIES_DATA_STREAM,
  storedDiscoverySchema,
  type StoredDiscovery,
  type discoveriesMappings,
} from './data_stream';
import { FIELD_DISCOVERY_ID, FIELD_EVENT_ID } from '../field_names';

/** Shape of a raw ES document before the `processed` flag is computed. */
type RawDiscoveryRow = Omit<Discovery, 'processed'>;

const toDiscovery = (raw: RawDiscoveryRow, processedEventIds: Set<string>): Discovery => ({
  ...raw,
  processed: processedEventIds.has(raw.event_id),
});

const PROCESSED_CHUNK_SIZE = 250;

export type DiscoveryDataStreamClient = IDataStreamClient<
  typeof discoveriesMappings,
  StoredDiscovery
>;

const KIND_HANDLED = 'handled' satisfies Discovery['kind'];
const KIND_CLEARANCE = 'clearance' satisfies Discovery['kind'];

export class DiscoveryClient {
  constructor(
    private readonly clients: {
      dataStreamClient: DiscoveryDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(
    discoveries: RawDiscoveryRow[],
    { throwOnFail = false }: BulkCreateOptions = {}
  ) {
    const response = await this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: discoveries.map((d) => storedDiscoverySchema.parse(d)),
    });

    if (throwOnFail) {
      throwOnBulkCreateErrors(response);
    }

    return response;
  }

  private buildWhere(): ESQLAstExpression {
    return esql.exp`${esql.col('kind')} != ${esql.str(KIND_HANDLED)}`;
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: Discovery[] }> {
    const result = await runLatestSourceEsqlQuery<RawDiscoveryRow>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      where: this.buildWhere(),
      groupBy: FIELD_EVENT_ID,
    });

    const processedEventIds = await this.getProcessedEventIds(
      result.hits.map((h) => h.event_id).filter((id): id is string => Boolean(id))
    );
    return {
      hits: result.hits.map((raw) => toDiscovery(raw, processedEventIds)),
    };
  }

  async findLatestPaginated(
    options: PaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<Discovery>> {
    const result = await runPaginatedLatestSourceEsqlQuery<RawDiscoveryRow>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DISCOVERIES_DATA_STREAM,
      where: this.buildWhere(),
      groupBy: FIELD_EVENT_ID,
    });

    if (!result.hits.length) return { ...result, hits: [] };

    const processedEventIds = await this.getProcessedEventIds(
      result.hits.map((h) => h.event_id).filter((id): id is string => Boolean(id))
    );

    return {
      ...result,
      hits: result.hits.map((raw) => toDiscovery(raw, processedEventIds)),
    };
  }

  private async getProcessedEventIds(eventIds: string[]): Promise<Set<string>> {
    return runGetProcessedIds({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_EVENT_ID,
      idValues: eventIds,
      stateKinds: ['discovery', KIND_CLEARANCE],
      handledKind: KIND_HANDLED,
      chunkSize: PROCESSED_CHUNK_SIZE,
    });
  }

  async findById(discoveryId: string): Promise<{ hits: Discovery[] }> {
    const result = await runFindByIdEsqlQuery<RawDiscoveryRow>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_DISCOVERY_ID,
      idValue: discoveryId,
    });

    const processedEventIds = await this.getProcessedEventIds(
      result.hits.map((h) => h.event_id).filter((id): id is string => Boolean(id))
    );

    return {
      hits: result.hits.map((raw) => toDiscovery(raw, processedEventIds)),
    };
  }

  async findByIds(discoveryIds: string[]): Promise<{ hits: Discovery[] }> {
    const result = await runFindByIdsEsqlQuery<RawDiscoveryRow>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_DISCOVERY_ID,
      idValues: discoveryIds,
    });

    const processedEventIds = await this.getProcessedEventIds(
      result.hits.map((h) => h.event_id).filter((id): id is string => Boolean(id))
    );

    return {
      hits: result.hits.map((raw) => toDiscovery(raw, processedEventIds)),
    };
  }

  async findByEventId(eventId: string): Promise<{ hits: Discovery[] }> {
    const result = await runFindByIdEsqlQuery<RawDiscoveryRow>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DISCOVERIES_DATA_STREAM,
      idField: FIELD_EVENT_ID,
      idValue: eventId,
    });

    const processedEventIds = await this.getProcessedEventIds(
      result.hits.map((h) => h.event_id).filter((id): id is string => Boolean(id))
    );

    return {
      hits: result.hits.map((raw) => toDiscovery(raw, processedEventIds)),
    };
  }
}
