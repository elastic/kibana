/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import { esql, type ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions, inList, parseSort } from '../query_utils';
import {
  applyTimeWindow,
  baseSpaceScopedQuery,
  collapseToLatest,
  executeSourceQuery,
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

export type DetectionSort = '@timestamp:asc' | '@timestamp:desc';

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
}

const applyIdentityFilters = (
  query: ComposerQuery,
  options: DetectionsSearchOptions
): ComposerQuery => {
  let next = query;
  if (options.rule_uuid?.length) {
    next = next.where`${inList('rule_uuid', options.rule_uuid)}`;
  }
  if (options.rule_name) {
    next = next.where`${esql.col('rule_name')} == ${esql.str(options.rule_name)}`;
  }
  if (options.stream_name) {
    next = next.where`${esql.col('stream')} == ${esql.str(options.stream_name)}`;
  }
  return next;
};

const applyStateFilters = (
  query: ComposerQuery,
  options: DetectionsSearchOptions
): ComposerQuery => {
  let next = query;
  if (options.silent !== undefined) {
    next = next.where`${esql.col('silent')} == ${options.silent}`;
  }
  if (options.superseded !== undefined) {
    next = next.where`${esql.col('superseded')} == ${options.superseded}`;
  }
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

    query = collapseToLatest(query, 'detection_id');

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

  async findLatestPerRule(options: DetectionsSearchOptions = {}): Promise<{ hits: Detection[] }> {
    let query = baseSpaceScopedQuery(DETECTIONS_DATA_STREAM, this.clients.space);

    query = applyTimeWindow(query, options);
    query = applyIdentityFilters(query, options);

    query = collapseToLatest(query, 'rule_uuid');

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
