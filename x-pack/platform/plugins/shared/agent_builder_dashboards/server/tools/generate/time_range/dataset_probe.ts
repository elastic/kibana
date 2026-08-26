/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getEsqlDataSourceCarriers } from '@kbn/agent-builder-visualizations-server';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ResolvedEsqlDataset } from '../../resolve_esql_dataset';
import { resolveEsqlDataset } from '../../resolve_esql_dataset';
import { getErrorMessage } from '../core';
import type { DatasetTimeRange } from './select_time_range';

/** Shared log prefix for the default-time-range step. */
export const LOG_PREFIX = '[default-time-range]';

/**
 * Extract ES|QL queries from every `data_source` carrier in a Lens config.
 *
 * Some Lens configs store the query on the root config, while layered charts
 * store one query per layer.
 */
const getEsqlQueriesFromConfig = (config: unknown): string[] => {
  const queries: string[] = [];
  for (const { data_source: dataSource } of getEsqlDataSourceCarriers(config)) {
    if (dataSource?.type === 'esql' && dataSource.query) {
      queries.push(dataSource.query);
    }
  }
  return queries;
};

/**
 * Distinct ES|QL queries backing the dashboard's Lens panels, including panels
 * nested inside sections. Markdown and any non-ES|QL Lens panels carry no query
 * and are ignored.
 */
export const extractEsqlQueries = (panels: DashboardAttachmentData['panels']): string[] => {
  const queries = new Set<string>();
  const collect = (config: unknown) => {
    for (const query of getEsqlQueriesFromConfig(config)) {
      queries.add(query);
    }
  };

  for (const widget of panels) {
    if (isSection(widget)) {
      for (const panel of widget.panels) {
        if (panel.type === LENS_EMBEDDABLE_TYPE) {
          collect(panel.config);
        }
      }
    } else if (widget.type === LENS_EMBEDDABLE_TYPE) {
      collect(widget.config);
    }
  }

  return [...queries];
};

interface MinMaxValue {
  value?: number | null;
}

const queryMinMax = async (
  esClient: IScopedClusterClient,
  { index, timeField }: ResolvedEsqlDataset,
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
      resolveEsqlDataset(esClient, query, projectRouting).catch((error) => {
        logger.debug(
          `${LOG_PREFIX} could not resolve a time field; skipping that panel: ${getErrorMessage(
            error
          )}`
        );
        return undefined;
      })
    )
  );

  const resolvedDatasetsMap = new Map<string, ResolvedEsqlDataset>();
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
