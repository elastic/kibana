/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { MappingProperty, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

export interface CreateSourceIndexParams {
  index: string;
  /**
   * Caller-provided property mappings. `@timestamp` is always included
   * because alerting_v2 rules require a `time_field` mapped as `date`.
   */
  mappings?: Record<string, MappingProperty>;
}

export interface IndexSourceDocsParams {
  index: string;
  docs: Array<Record<string, unknown>>;
}

export interface DeleteSourceDocsParams {
  index: string;
  query: QueryDslQueryContainer;
}

export interface DeleteSourceIndexParams {
  index: string;
}

/**
 * Test-time helper for managing source data indices that alerting_v2 rules
 * query via ES|QL. Creation tolerates `index_already_exists`, deletion
 * tolerates a missing index, and inserts/deletes use `refresh: 'wait_for'`
 * (or `refresh: true`) so subsequent rule executions immediately see the
 * change.
 */
export interface SourceIndexApiService {
  create: (params: CreateSourceIndexParams) => Promise<void>;
  indexDocs: (params: IndexSourceDocsParams) => Promise<void>;
  deleteDocs: (params: DeleteSourceDocsParams) => Promise<void>;
  delete: (params: DeleteSourceIndexParams) => Promise<void>;
}

export const getSourceIndexApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: EsClient;
}): SourceIndexApiService => ({
  create: ({ index, mappings = {} }) =>
    measurePerformanceAsync(log, `sourceIndex[${index}].create`, async () => {
      await esClient.indices.create(
        {
          index,
          mappings: {
            properties: { '@timestamp': { type: 'date' }, ...mappings },
          },
        },
        { ignore: [400] }
      );
    }),

  indexDocs: ({ index, docs }) =>
    measurePerformanceAsync(log, `sourceIndex[${index}].indexDocs`, async () => {
      if (docs.length === 0) return;
      await esClient.bulk({
        operations: docs.flatMap((doc) => [{ index: { _index: index } }, doc]),
        refresh: 'wait_for',
      });
    }),

  deleteDocs: ({ index, query }) =>
    measurePerformanceAsync(log, `sourceIndex[${index}].deleteDocs`, async () => {
      await esClient.deleteByQuery(
        {
          index,
          query,
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    }),

  delete: ({ index }) =>
    measurePerformanceAsync(log, `sourceIndex[${index}].delete`, async () => {
      await esClient.indices.delete({ index }, { ignore: [404] });
    }),
});
