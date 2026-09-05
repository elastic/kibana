/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import { buildTimeRangeParams } from '@kbn/agent-builder-genai-utils/tools/utils/esql';

/**
 * Default range used only to bind `?_tstart`/`?_tend` when executing a query
 * server-side to collect its result columns. The live dashboard range is applied
 * by Kibana at render time.
 */
export const DEFAULT_VALIDATION_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/** Execute a visualization query, keeping all-null sample columns for authoring. */
export const executeForAuthoring = ({
  query,
  esClient,
}: {
  query: string;
  esClient: ElasticsearchClient;
}): ReturnType<typeof executeEsql> =>
  executeEsql({
    query,
    params: buildTimeRangeParams(DEFAULT_VALIDATION_TIME_RANGE),
    dropNullColumns: false,
    esClient,
  });

/** Execute a provided query, or return the error so the caller can regenerate. */
export const tryExecuteForAuthoring = async ({
  query,
  esClient,
}: {
  query: string;
  esClient: ElasticsearchClient;
}): Promise<{ ok: true; columns: EsqlEsqlColumnInfo[] } | { ok: false; error: string }> => {
  try {
    const { columns } = await executeForAuthoring({ query, esClient });
    return { ok: true, columns };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};
