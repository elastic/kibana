/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql, type ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type TimestampSort,
  applyFilter,
  applyTimeWindow,
  collapseToLatest,
  parseSort,
} from '../query_utils';
import { baseSpaceScopedQuery, executeSourceQuery } from '../latest_source_query';
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

export type DetectionSort = TimestampSort;

export type DetectionGroupBy = 'detection_id' | 'rule_uuid';

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
  size?: number;
  sort?: DetectionSort[];
  group_by?: DetectionGroupBy;
}

const applyIdentityFilters = (
  query: ComposerQuery,
  options: DetectionsSearchOptions
): ComposerQuery => {
  let next = applyFilter(query, 'rule_uuid', options.rule_uuid);
  next = applyFilter(next, 'rule_name', options.rule_name);
  next = applyFilter(next, 'stream', options.stream_name);
  return next;
};

const applyStateFilters = (
  query: ComposerQuery,
  options: DetectionsSearchOptions
): ComposerQuery => {
  let next = applyFilter(query, 'silent', options.silent);
  next = applyFilter(next, 'superseded', options.superseded);
  if (options.superseded_at?.from) {
    next = next.where`${esql.col('superseded_at')} >= TO_DATETIME(${esql.str(
      options.superseded_at.from
    )})`;
  }
  if (options.superseded_at?.to) {
    next = next.where`${esql.col('superseded_at')} <= TO_DATETIME(${esql.str(
      options.superseded_at.to
    )})`;
  }
  return next;
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
    let query = baseSpaceScopedQuery(DETECTIONS_DATA_STREAM, this.clients.space);

    query = applyTimeWindow(query, options);
    query = applyIdentityFilters(query, options);

    query = collapseToLatest(query, options.group_by ?? 'detection_id');

    query = applyStateFilters(query, options);

    if (options.sort?.length) {
      const sort = options.sort.map(parseSort);
      query = query.sort(sort[0], ...sort.slice(1));
    }
    query = query.keep('_source');
    if (options.size !== undefined) {
      query = query.limit(options.size);
    }

    return executeSourceQuery<Detection>(this.clients.esClient, query);
  }
}
