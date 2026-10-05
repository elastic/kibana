/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getIndexPatternFromESQLQuery, parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import type { DatasetTimeRange } from './select_time_range';

const DEFAULT_TIME_FIELD = '@timestamp';
/** Shared log prefix for the default-time-range step. */
export const LOG_PREFIX = '[default-time-range]';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface ResolvedDataset {
  index: string;
  timeField: string;
}

const indexHasTimestamp = async (
  esClient: IScopedClusterClient,
  index: string,
  projectRouting?: string
): Promise<boolean> => {
  const response = await esClient.asCurrentUser.fieldCaps({
    index,
    fields: DEFAULT_TIME_FIELD,
    include_unmapped: false,
    project_routing: projectRouting,
  });
  return Boolean(response.fields?.[DEFAULT_TIME_FIELD]);
};

/**
 * Resolve the time field used for the default time range.
 *
 * Prefer the field referenced by `?_tstart` / `?_tend` in the ES|QL query. If the
 * query has no explicit time-bound field, fall back to `@timestamp` when the
 * index exposes it. Queries without a resolvable time field are treated as
 * time-independent and skipped.
 */
const resolveDataset = async (
  esClient: IScopedClusterClient,
  query: string,
  projectRouting?: string
): Promise<ResolvedDataset | null> => {
  const index = getIndexPatternFromESQLQuery(query);
  if (!index) {
    return null;
  }
  const queryTimeField = parseTimeFieldFromESQLQuery(query);
  if (queryTimeField) {
    return { index, timeField: queryTimeField };
  }
  if (await indexHasTimestamp(esClient, index, projectRouting)) {
    return { index, timeField: DEFAULT_TIME_FIELD };
  }
  return null;
};

interface MinMaxValue {
  value?: number | null;
}

const queryMinMax = async (
  esClient: IScopedClusterClient,
  { index, timeField }: ResolvedDataset,
  projectRouting?: string
): Promise<DatasetTimeRange | null> => {
  const { aggregations } = await esClient.asCurrentUser.search({
    index,
    size: 0,
    track_total_hits: false,
    aggs: {
      min_time: { min: { field: timeField } },
      max_time: { max: { field: timeField } },
    },
    ...(projectRouting ? { project_routing: projectRouting } : {}),
  });

  const minMs = (aggregations?.min_time as MinMaxValue | undefined)?.value;
  const maxMs = (aggregations?.max_time as MinMaxValue | undefined)?.value;
  if (minMs == null || maxMs == null) {
    return null;
  }
  return { index, timeField, minMs, maxMs };
};

export interface ProbeDatasetTimeRangesParams {
  esClient: IScopedClusterClient;
  queries: string[];
  logger: Logger;
  projectRouting?: string;
}

/**
 * For each distinct (index, time field) dataset behind the given ES|QL queries,
 * run one `min`/`max` aggregation to find where its data sits in time. Datasets
 * that are not time-bound or hold no data are dropped.
 */
export const probeDatasetTimeRanges = async ({
  esClient,
  queries,
  logger,
  projectRouting,
}: ProbeDatasetTimeRangesParams): Promise<DatasetTimeRange[]> => {
  const resolvedDatasets = await Promise.all(
    queries.map((query) =>
      resolveDataset(esClient, query, projectRouting).catch((error) => {
        logger.debug(
          `${LOG_PREFIX} could not resolve a time field; skipping that query: ${getErrorMessage(
            error
          )}`
        );
        return null;
      })
    )
  );

  const resolvedDatasetsMap = new Map<string, ResolvedDataset>();
  for (const dataset of resolvedDatasets) {
    if (dataset) {
      resolvedDatasetsMap.set(`${dataset.index}::${dataset.timeField}`, dataset);
    }
  }

  const ranges = await Promise.all(
    [...resolvedDatasetsMap.values()].map((dataset) =>
      queryMinMax(esClient, dataset, projectRouting).catch((error) => {
        logger.debug(
          `${LOG_PREFIX} min/max probe failed for ${dataset.index}; skipping it: ${getErrorMessage(
            error
          )}`
        );
        return null;
      })
    )
  );
  return ranges.filter((range): range is DatasetTimeRange => range !== null);
};
