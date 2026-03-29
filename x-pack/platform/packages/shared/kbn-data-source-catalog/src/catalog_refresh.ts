/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CatalogClient } from './catalog_client';
import { discoverIndexMetadata } from './providers/index_metadata_provider';
import { fetchIntegrationMetadata, type PackageClientLike } from './providers/integration_provider';
import { fetchIndexStats } from './providers/index_stats_provider';
import { generateHeuristicSummary } from './providers/heuristic_summary_provider';
import type { DataSourceEntry, IntegrationMetadata } from './types';
import { globToRegex } from './utils';

interface RefreshCatalogParams {
  esClient: ElasticsearchClient;
  packageClient?: PackageClientLike;
  patterns: string[];
  includeStats?: boolean;
}

interface RefreshResult {
  entriesCount: number;
  durationMs: number;
}

export async function refreshCatalog({
  esClient,
  packageClient,
  patterns,
  includeStats,
}: RefreshCatalogParams): Promise<RefreshResult> {
  const start = Date.now();

  const catalogClient = new CatalogClient(esClient);
  await catalogClient.ensureIndex();

  const entries = await discoverIndexMetadata(esClient, patterns);

  let integrationMap: Map<string, IntegrationMetadata> | undefined;
  if (packageClient) {
    integrationMap = await fetchIntegrationMetadata(packageClient);
  }

  if (integrationMap && integrationMap.size > 0) {
    for (const entry of entries) {
      const matched = matchIntegration(entry, integrationMap);
      if (matched) {
        entry.integration = matched;
      }
    }
  }

  // Step 4 (new): Fetch stats if requested
  if (includeStats) {
    const names = entries.map((e) => e.name);
    const statsMap = await fetchIndexStats(esClient, names);
    for (const entry of entries) {
      const stats = statsMap.get(entry.name);
      if (stats) {
        entry.stats = stats;
      }
    }
  }

  // Step 5: Generate heuristic summaries for all entries
  for (const entry of entries) {
    entry.semantic = generateHeuristicSummary(entry);
  }

  await catalogClient.bulkUpsert(entries);

  return {
    entriesCount: entries.length,
    durationMs: Date.now() - start,
  };
}

function matchIntegration(
  entry: DataSourceEntry,
  integrationMap: Map<string, IntegrationMetadata>
): IntegrationMetadata | undefined {
  for (const [pattern, metadata] of integrationMap) {
    const regex = globToRegex(pattern);
    if (regex.test(entry.name)) {
      return metadata;
    }
  }
  return undefined;
}
