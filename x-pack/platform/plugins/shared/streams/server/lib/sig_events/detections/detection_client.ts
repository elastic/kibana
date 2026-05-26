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
  type PaginatedSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  type LatestSourceWhereCondition,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
  queryEsql,
  esqlToObjects,
} from '../latest_source_query';
import {
  DETECTIONS_DATA_STREAM,
  type Detection,
  type StoredDetection,
  type detectionsMappings,
} from './data_stream';

export type DetectionDataStreamClient = IDataStreamClient<
  typeof detectionsMappings,
  StoredDetection
>;

// _source holds all stored fields; `processed` is derived at query time, not stored.
// Using Omit<Detection, 'processed'> avoids the string | string[] widening from GetFieldsOf.
type RawDetection = Omit<Detection, 'processed'>;

export interface DetectionsSearchOptions extends CommonSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
}

export interface DetectionsPaginatedSearchOptions extends PaginatedSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
}

const andWhere = (
  current: LatestSourceWhereCondition | undefined,
  next: LatestSourceWhereCondition
): LatestSourceWhereCondition => {
  return current ? esql.exp`${current} AND ${next}` : next;
};

const GROUP_BY_FIELD = 'detection_id';
const KIND_HANDLED = 'handled';
const PROCESSED_IDS_CHUNK_SIZE = 250;

export class DetectionClient {
  constructor(
    private readonly clients: {
      dataStreamClient: DetectionDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(detections: Detection[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: detections,
    });
  }

  // Exclude kind:handled from the main query — handled docs are pipeline stamps,
  // not anomaly state. processed is derived separately via getProcessedIds.
  private buildWhere(options: DetectionsSearchOptions): LatestSourceWhereCondition {
    let where: LatestSourceWhereCondition = esql.exp`${esql.col('kind')} != ${esql.str(
      KIND_HANDLED
    )}`;

    const ruleUuidLiterals = options.rule_uuid?.map((ruleUuid) => esql.str(ruleUuid));
    if (ruleUuidLiterals?.length) {
      where = andWhere(where, esql.exp`${esql.col('rule_uuid')} IN (${ruleUuidLiterals})`);
    }

    if (options.rule_name) {
      where = andWhere(where, esql.exp`${esql.col('rule_name')} == ${esql.str(options.rule_name)}`);
    }

    return where;
  }

  // Returns detection_ids that have a kind:handled doc — used to derive processed flag.
  // Chunked to avoid oversized ES|QL IN clauses when many detections are on screen.
  private async getProcessedIds(detectionIds: string[]): Promise<Set<string>> {
    if (!detectionIds.length) return new Set();

    const processed = new Set<string>();
    for (let i = 0; i < detectionIds.length; i += PROCESSED_IDS_CHUNK_SIZE) {
      const batch = detectionIds.slice(i, i + PROCESSED_IDS_CHUNK_SIZE);
      const idLiterals = batch.map((id) => esql.str(id));
      let query = esql.from([DETECTIONS_DATA_STREAM]).where`${esql.col('kind')} == ${esql.str(
        KIND_HANDLED
      )}`;
      query = query.where`${esql.col('detection_id')} IN (${idLiterals})`;
      query = query.pipe`STATS BY ${esql.col('detection_id')}`.keep('detection_id');

      const response = await queryEsql({ esClient: this.clients.esClient, query: query.print() });
      const rows = esqlToObjects<{ detection_id?: string }>(response);
      for (const r of rows) {
        if (r.detection_id) processed.add(r.detection_id);
      }
    }
    return processed;
  }

  private toDetection(raw: RawDetection, processed: boolean): Detection {
    return { ...raw, processed };
  }

  async findLatest(options: DetectionsSearchOptions = {}): Promise<{ hits: Detection[] }> {
    const result = await runLatestSourceEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: GROUP_BY_FIELD,
    });
    const processedIds = await this.getProcessedIds(
      result.hits.map((h) => h.detection_id).filter((id): id is string => Boolean(id))
    );
    return {
      hits: result.hits.map((raw) =>
        this.toDetection(raw, processedIds.has(raw.detection_id ?? ''))
      ),
    };
  }

  async findLatestPaginated(
    options: DetectionsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<Detection>> {
    const result = await runPaginatedLatestSourceEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: GROUP_BY_FIELD,
      sort: [['detected_at', 'DESC']],
    });
    const processedIds = await this.getProcessedIds(
      result.hits.map((h) => h.detection_id).filter((id): id is string => Boolean(id))
    );
    return {
      ...result,
      hits: result.hits.map((raw) =>
        this.toDetection(raw, processedIds.has(raw.detection_id ?? ''))
      ),
    };
  }

  async findById(detectionId: string): Promise<{ hits: Detection[] }> {
    const result = await runFindByIdEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: GROUP_BY_FIELD,
      idValue: detectionId,
    });
    // History shows all docs including handled — derive processed from presence of handled doc.
    const hasHandled = result.hits.some((h) => h.kind === KIND_HANDLED);
    return { hits: result.hits.map((raw) => this.toDetection(raw, hasHandled)) };
  }
}
