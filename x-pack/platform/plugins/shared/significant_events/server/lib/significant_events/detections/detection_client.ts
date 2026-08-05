/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  andWhere,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
  runFindByIdsEsqlQuery,
  runGetProcessedMarkerIds,
} from '../latest_source_query';
import {
  DETECTIONS_DATA_STREAM,
  type Detection,
  type StoredDetection,
  type detectionsMappings,
} from './data_stream';
import { FIELD_DETECTION_ID, FIELD_RULE_UUID } from '../field_names';

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

const PROCESSED_MARKER_CHUNK_SIZE = 250;

// Cap the per-rule detection history (flyout timeline) to the most recent N transitions so a churny
// rule doesn't produce an unbounded scroll.
const DETECTION_HISTORY_LIMIT = 20;

// Detections carry `change_point_type`; processed markers carry `processed_by` instead.
// Every detection read filters on this so marker docs never surface as detections.
const detectionFilter = (): ESQLAstExpression =>
  esql.exp`${esql.col('change_point_type')} IS NOT NULL`;

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

  // Detection reads group the latest revision per rule (rule_uuid), not per detection id —
  // detection_id is now unique-per-detection, so grouping by it would never collapse.
  private buildWhere(options: DetectionsSearchOptions): ESQLAstExpression {
    let where: ESQLAstExpression = detectionFilter();

    const ruleUuidLiterals = options.rule_uuid?.map((ruleUuid) => esql.str(ruleUuid));
    if (ruleUuidLiterals?.length) {
      where = andWhere(where, esql.exp`${esql.col('rule_uuid')} IN (${ruleUuidLiterals})`);
    }

    if (options.rule_name) {
      where = andWhere(where, esql.exp`${esql.col('rule_name')} == ${esql.str(options.rule_name)}`);
    }

    return where;
  }

  // `processed` is derived: a detection is processed iff a marker references its exact id.
  private async getProcessedIds(detectionIds: string[]): Promise<Set<string>> {
    return runGetProcessedMarkerIds({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValues: detectionIds,
      chunkSize: PROCESSED_MARKER_CHUNK_SIZE,
    });
  }

  async findById(detectionId: string): Promise<{ hits: Detection[] }> {
    const { hits } = await runFindByIdEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValue: detectionId,
      where: detectionFilter(),
    });
    return { hits: await this.withDerivedProcessed(hits) };
  }

  async findByIds(detectionIds: string[]): Promise<{ hits: Detection[] }> {
    const { hits } = await runFindByIdsEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValues: detectionIds,
      where: detectionFilter(),
    });
    return { hits: await this.withDerivedProcessed(hits) };
  }

  // A rule's change-point timeline: every detection for the rule, oldest→newest. Keyed on
  // rule_uuid (not detection_id) because detection_id is unique per detection — the list
  // collapses to the latest per rule, and the flyout expands the full history here.
  async findHistoryByRuleUuid(ruleUuid: string): Promise<{ hits: Detection[] }> {
    const { hits } = await runFindByIdEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_RULE_UUID,
      idValue: ruleUuid,
      where: detectionFilter(),
      // Most recent N transitions, returned chronologically (oldest→newest of that window).
      limit: DETECTION_HISTORY_LIMIT,
    });
    return { hits: await this.withDerivedProcessed(hits) };
  }

  async findLatest(options: DetectionsSearchOptions = {}): Promise<{ hits: Detection[] }> {
    const result = await runLatestSourceEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_RULE_UUID,
    });
    return { hits: await this.withDerivedProcessed(result.hits) };
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
      groupBy: FIELD_RULE_UUID,
      sort: [['@timestamp', 'DESC']],
    });

    return { ...result, hits: await this.withDerivedProcessed(result.hits) };
  }

  private async withDerivedProcessed(rawHits: RawDetection[]): Promise<Detection[]> {
    const processedIds = await this.getProcessedIds(
      rawHits.map((h) => h.detection_id).filter((id): id is string => Boolean(id))
    );
    return rawHits.map(
      (raw) => ({ ...raw, processed: processedIds.has(raw.detection_id ?? '') } as Detection)
    );
  }
}
