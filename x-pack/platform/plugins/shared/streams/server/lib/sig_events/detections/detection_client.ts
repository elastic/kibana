/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { runLatestEsqlQuery } from '../latest_query';
import {
  DETECTIONS_DATA_STREAM,
  type StoredDetection,
  type detectionsMappings,
} from './data_stream';

export interface Detection {
  '@timestamp': string;
  detection_id: string;
  rule_uuid: string;
  rule_name: string;
  stream: string;
}

const DETECTION_FIELDS: ReadonlyArray<keyof Detection & string> = [
  '@timestamp',
  'detection_id',
  'rule_uuid',
  'rule_name',
  'stream',
];

export type DetectionDataStreamClient = IDataStreamClient<
  typeof detectionsMappings,
  StoredDetection
>;

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

  async find(options: CommonSearchOptions = {}): Promise<{ hits: Detection[] }> {
    return runLatestEsqlQuery<Detection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      fields: DETECTION_FIELDS,
      stats: (query) => query.pipe`STATS @timestamp = MAX(@timestamp),
              rule_uuid = LATEST(rule_uuid),
              rule_name = LATEST(rule_name),
              stream = LATEST(stream)
          BY detection_id`,
    });
  }
}
