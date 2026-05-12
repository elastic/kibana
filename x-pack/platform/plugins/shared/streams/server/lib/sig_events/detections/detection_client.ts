/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { type LatestSourceWhereCondition, runLatestSourceEsqlQuery } from '../latest_source_query';
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

export interface DetectionsSearchOptions extends CommonSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
  stream_name?: string;
  silent?: boolean;
  superseded?: boolean;
  superseded_at?: {
    /** ISO 8601 formatted datetime */
    from?: string;
    /** ISO 8601 formatted datetime */
    to?: string;
  };
}

const andWhere = (
  current: LatestSourceWhereCondition | undefined,
  next: LatestSourceWhereCondition
): LatestSourceWhereCondition => {
  return current ? esql.exp`${current} AND ${next}` : next;
};

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

  async findLatest(options: DetectionsSearchOptions = {}): Promise<{ hits: Detection[] }> {
    const ruleUuidLiterals = options.rule_uuid?.map((ruleUuid) => esql.str(ruleUuid));
    let where: LatestSourceWhereCondition | undefined;

    if (ruleUuidLiterals?.length) {
      where = andWhere(where, esql.exp`${esql.col('rule_uuid')} IN (${ruleUuidLiterals})`);
    }

    if (options.rule_name) {
      where = andWhere(where, esql.exp`${esql.col('rule_name')} == ${esql.str(options.rule_name)}`);
    }

    if (options.stream_name) {
      where = andWhere(where, esql.exp`${esql.col('stream')} == ${esql.str(options.stream_name)}`);
    }

    if (options.silent !== undefined) {
      where = andWhere(where, esql.exp`${esql.col('silent')} == ${options.silent}`);
    }

    if (options.superseded !== undefined) {
      where = andWhere(where, esql.exp`${esql.col('superseded')} == ${options.superseded}`);
    }

    if (options.superseded_at?.from) {
      where = andWhere(
        where,
        esql.exp`${esql.col('superseded_at')} >= TO_DATETIME(${esql.str(
          options.superseded_at.from
        )})`
      );
    }

    if (options.superseded_at?.to) {
      where = andWhere(
        where,
        esql.exp`${esql.col('superseded_at')} <= TO_DATETIME(${esql.str(options.superseded_at.to)})`
      );
    }

    return runLatestSourceEsqlQuery<Detection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where,
      groupBy: 'detection_id',
    });
  }
}
