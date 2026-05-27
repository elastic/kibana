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
  inFilter,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
} from '../latest_source_query';
import {
  DETECTIONS_DATA_STREAM,
  type Detection,
  type StoredDetection,
  type detectionsMappings,
} from './data_stream';
import { FIELD_DETECTION_ID } from '../field_names';

export type DetectionDataStreamClient = IDataStreamClient<
  typeof detectionsMappings,
  StoredDetection
>;

export interface DetectionsSearchOptions extends CommonSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
}

export interface DetectionsPaginatedSearchOptions extends PaginatedSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
}

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

  private buildWhere(options: DetectionsSearchOptions): ESQLAstExpression | undefined {
    let where: ESQLAstExpression | undefined;
    where = inFilter({ where, field: 'rule_uuid', values: options.rule_uuid });

    if (options.rule_name) {
      where = andWhere(where, esql.exp`${esql.col('rule_name')} == ${esql.str(options.rule_name)}`);
    }

    return where;
  }

  async findLatest(options: DetectionsSearchOptions = {}): Promise<{ hits: Detection[] }> {
    return runLatestSourceEsqlQuery<Detection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_DETECTION_ID,
    });
  }

  async findLatestPaginated(
    options: DetectionsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<Detection>> {
    return runPaginatedLatestSourceEsqlQuery<Detection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_DETECTION_ID,
    });
  }

  async findById(detectionId: string): Promise<{ hits: Detection[] }> {
    return runFindByIdEsqlQuery<Detection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValue: detectionId,
    });
  }
}
