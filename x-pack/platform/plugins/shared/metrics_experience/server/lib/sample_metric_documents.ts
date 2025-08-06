/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type Logger } from '@kbn/core/server';
import { flattenDocument, getStringFieldPaths } from './document_flattener';

export async function sampleMetricDocuments(
  esClient: ElasticsearchClient,
  indexPattern: string,
  metricNames: string[],
  logger: Logger
): Promise<Map<string, string[]>> {
  if (metricNames.length === 0) {
    return new Map();
  }

  try {
    // Build msearch body with header/body pairs for each metric
    const body: any[] = [];

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
      });
    }

    const response = await esClient.msearch({ body });
    const results = new Map<string, string[]>();

    // Process responses for each metric
    for (let i = 0; i < metricNames.length; i++) {
      const metricName = metricNames[i];
      const searchResult = response.responses[i] as any;

      if (searchResult && !searchResult.error && searchResult.hits?.hits?.length > 0) {
        const document = searchResult.hits.hits[0]._source as any;
        const flatDocument = flattenDocument(document);
        results.set(metricName, getStringFieldPaths(flatDocument));
      } else {
        // Log error if present, otherwise set empty array
        if (searchResult?.error) {
          logger.error(`Error sampling document for metric ${metricName}: ${searchResult.error}`);
        }
        results.set(metricName, []);
      }
    }

    return results;
  } catch (error) {
    logger.error(`Error sampling documents for metrics in ${indexPattern}: ${error.message}`);
    // Return empty results for all metrics on error
    const results = new Map<string, string[]>();
    for (const metricName of metricNames) {
      results.set(metricName, []);
    }
    return results;
  }
}

export async function batchedSampleMetricDocuments(
  esClient: ElasticsearchClient,
  indexPattern: string,
  metricNames: string[],
  batchSize: number = 500,
  logger: Logger
): Promise<Map<string, string[]>> {
  if (metricNames.length === 0) {
    return new Map();
  }

  const allResults = new Map<string, string[]>();

  try {
    // Process metrics in batches to avoid overwhelming Elasticsearch
    for (let i = 0; i < metricNames.length; i += batchSize) {
      const batch = metricNames.slice(i, i + batchSize);

      const batchResults = await sampleMetricDocuments(esClient, indexPattern, batch, logger);

      // Merge batch results into overall results
      for (const [metricName, dimensions] of batchResults) {
        allResults.set(metricName, dimensions);
      }
    }

    return allResults;
  } catch (error) {
    logger.error(`Error in batched sampling for metrics in ${indexPattern}: ${error}`);
    // Return empty results for all metrics on error
    const results = new Map<string, string[]>();
    for (const metricName of metricNames) {
      results.set(metricName, []);
    }
    return results;
  }
}
