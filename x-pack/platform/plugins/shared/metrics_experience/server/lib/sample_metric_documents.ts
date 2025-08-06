/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type Logger } from '@kbn/core/server';
import { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import { joinArrayValues } from './join_array_values';

export async function sampleMetricDocuments({
  esClient,
  indexPattern,
  metricNames,
  dimensionFields,
  logger,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  metricNames: string[];
  dimensionFields: string[];
  logger: Logger;
}): Promise<Map<string, string[]>> {
  if (metricNames.length === 0) {
    return new Map();
  }

  const metricsDocumentMap = new Map<string, string[]>();
  try {
    // Build msearch body with header/body pairs for each metric
    const body: MsearchRequestItem[] = [];

    for (const metricName of metricNames) {
      // Header for each search
      body.push({ index: indexPattern });
      // Body for each search
      body.push({
        size: 1,
        terminate_after: 1,
        query: {
          exists: {
            field: metricName,
          },
        },
        _source: true,
        fields: dimensionFields,
      });
    }

    const response = await esClient.msearch({ body });

    // Process responses for each metric
    for (let i = 0; i < metricNames.length; i++) {
      const metricName = metricNames[i];
      const searchResult = response.responses[i] as any;
      if (searchResult && !searchResult.error && searchResult.hits?.hits?.length > 0) {
        const fields = searchResult.hits.hits[0].fields as any;
        const actualDimensions = joinArrayValues(fields);
        metricsDocumentMap.set(metricName, Object.keys(actualDimensions));
      } else {
        // Log error if present, otherwise set empty array
        if (searchResult?.error) {
          logger.error(`Error sampling document for metric ${metricName}: ${searchResult.error}`);
        }
        metricsDocumentMap.set(metricName, []);
      }
    }
  } catch (error) {
    logger.error(`Error sampling documents for metrics in ${indexPattern}: ${error.message}`);
    // Return empty results for all metrics on error
    for (const metricName of metricNames) {
      metricsDocumentMap.set(metricName, []);
    }
  }
  return metricsDocumentMap;
}

export type SampleMetricDocumentsResults = Promise<Map<string, string[]>>;

export async function batchedSampleMetricDocuments({
  esClient,
  indexPattern,
  metricNames,
  dimensionFields,
  batchSize = 500,
  logger,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  metricNames: string[];
  dimensionFields: string[];
  batchSize: number;
  logger: Logger;
}): SampleMetricDocumentsResults {
  if (metricNames.length === 0) {
    return new Map();
  }

  const allMetricsDocumentMap = new Map<string, string[]>();

  try {
    // Process metrics in batches to avoid overwhelming Elasticsearch
    for (let i = 0; i < metricNames.length; i += batchSize) {
      const batch = metricNames.slice(i, i + batchSize);

      const batchResults = await sampleMetricDocuments({
        esClient,
        indexPattern,
        metricNames: batch,
        logger,
        dimensionFields,
      });

      // Merge batch results into overall results
      for (const [metricName, dimensions] of batchResults) {
        allMetricsDocumentMap.set(metricName, dimensions);
      }
    }
  } catch (error) {
    logger.error(`Error in batched sampling for metrics in ${indexPattern}: ${error}`);
    // Return empty results for all metrics on error
    for (const metricName of metricNames) {
      allMetricsDocumentMap.set(metricName, []);
    }
  }
  return allMetricsDocumentMap;
}
