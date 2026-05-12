/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Index Discovery Service
 *
 * Auto-discovers available security-relevant data sources in Elasticsearch.
 * Uses `indices.resolveIndex` to cleanly separate:
 *   - Data streams (logs-*, metrics-*, traces-*) — append-only time-series data
 *   - Regular indices (.internal.alerts-*, etc.) — standard CRUD indices
 *   - Aliases — excluded (query the underlying data stream or index instead)
 *
 * Data streams are preferred over their backing indices because:
 *   - Queries use the data stream name (e.g., `logs-endpoint.events.process-default`)
 *   - Backing indices (`.ds-logs-...-000001`) are internal and may roll over
 *   - ES|QL and KQL queries target the data stream name
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

interface JsonObject {
  [key: string]: JsonValue;
}
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export interface IndexInfo {
  name: string;
  type: 'alerts' | 'logs' | 'metrics' | 'traces' | 'other';
  isDataStream: boolean;
  docCount: number;
  ageRange: { oldest: Date; newest: Date };
  fields: string[];
  relevanceScore: number; // 0-100, higher = more relevant to security operations
}

export interface IndexCatalog {
  indices: IndexInfo[];
  totalDocCount: number;
  discoveredAt: Date;
  securityRelevantCount: number;
}

/**
 * Enumerate all available data sources and identify security-relevant ones.
 *
 * Uses `resolveIndex` to get clean data stream names instead of backing indices.
 * This ensures generated skills reference queryable names like
 * `logs-endpoint.events.process-default` instead of `.ds-logs-...-000001`.
 */
export async function discoverIndices(
  esClient: IScopedClusterClient,
  logger: Logger,
  maxIndices = 100
): Promise<IndexCatalog> {
  logger.debug('[AESOP] Starting index discovery...');

  const startTime = Date.now();
  const catalog: IndexCatalog = {
    indices: [],
    totalDocCount: 0,
    discoveredAt: new Date(),
    securityRelevantCount: 0,
  };

  try {
    // Step 1: Resolve all indices and data streams in one call
    // resolveIndex cleanly separates indices, data_streams, and aliases.
    // Use asCurrentUser so discovery is scoped to the caller's RBAC — we must
    // not leak index names or document samples from indices the user would
    // not normally be able to read.
    const resolved = await esClient.asCurrentUser.indices.resolveIndex({
      name: '*',
      expand_wildcards: ['open', 'hidden'],
    });

    // Collect data stream names (preferred — these are the queryable names)
    const dataStreamNames = (resolved.data_streams || [])
      .map((ds) => ds.name)
      .filter((name) => !isExcludedDataStream(name));

    // Collect regular index names (non-data-stream, non-system)
    const regularIndexNames = (resolved.indices || [])
      .filter((idx) => !idx.attributes?.includes('system'))
      .map((idx) => idx.name)
      .filter((name) => !isSystemIndex(name) && !isBackingIndex(name));

    const allNames = [...dataStreamNames, ...regularIndexNames];

    logger.info(
      `[AESOP] Resolved ${dataStreamNames.length} data streams + ${regularIndexNames.length} regular indices`
    );

    // Step 2: Prioritize by relevance (security-relevant first)
    const prioritized = prioritizeIndices(allNames);
    const toSample = prioritized.slice(0, maxIndices);

    // Step 3: Sample each source for metadata
    for (const name of toSample) {
      try {
        const isDs = dataStreamNames.includes(name);
        const indexInfo = await sampleIndex(esClient, logger, name, isDs);

        if (indexInfo) {
          catalog.indices.push(indexInfo);
          catalog.totalDocCount += indexInfo.docCount;

          if (indexInfo.relevanceScore > 50) {
            catalog.securityRelevantCount += 1;
          }
        }
      } catch (error) {
        logger.debug(`[AESOP] Failed to sample ${name}:`, error);
      }
    }

    // Sort by relevance score (descending)
    catalog.indices.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const elapsed = Date.now() - startTime;
    logger.info(
      `[AESOP] Index discovery complete: ${catalog.indices.length} sources (${catalog.securityRelevantCount} security-relevant), ${elapsed}ms`
    );

    return catalog;
  } catch (error) {
    logger.error('[AESOP] Index discovery failed:', error);
    throw error;
  }
}

/**
 * Categorize a data source by type based on naming patterns.
 * Works with both data stream names (logs-endpoint.events.process-default)
 * and regular index names (.internal.alerts-security.alerts-default-000001).
 */
function categorizeIndex(name: string): IndexInfo['type'] {
  const lower = name.toLowerCase();
  if (lower.includes('alert')) return 'alerts';
  if (lower.startsWith('logs-') || lower.includes('log')) return 'logs';
  if (lower.startsWith('metrics-') || lower.includes('metric')) return 'metrics';
  if (lower.startsWith('traces-') || lower.includes('trace') || lower.includes('apm'))
    return 'traces';
  return 'other';
}

/**
 * Calculate relevance score for security operations (0-100).
 */
function calculateRelevanceScore(name: string, docCount: number, type: IndexInfo['type']): number {
  let score = 0;

  const typeScores: Record<IndexInfo['type'], number> = {
    alerts: 100,
    logs: 80,
    metrics: 60,
    traces: 50,
    other: 10,
  };

  score += typeScores[type];

  if (name.includes('security') || name.includes('endpoint')) score += 10;
  if (name.includes('threat') || name.includes('malware')) score += 15;
  if (name.includes('chat-conversations')) score += 20;
  if (name.includes('detection') || name.includes('rule')) score += 10;

  if (docCount === 0) score -= 50;

  return Math.max(0, Math.min(100, score));
}

/**
 * Prioritize data sources for sampling (security-relevant first).
 */
function prioritizeIndices(names: string[]): string[] {
  const securityPatterns = [
    'alert',
    'detection',
    'threat',
    'security',
    'endpoint',
    'malware',
    'intrusion',
    'chat-conversations',
  ];

  const isSecurity = (name: string) => securityPatterns.some((p) => name.toLowerCase().includes(p));

  const security = names.filter(isSecurity);
  const other = names.filter((n) => !isSecurity(n));

  return [...security, ...other];
}

/**
 * Check if a regular index is a system index that should be skipped.
 * Note: data streams are filtered separately via isExcludedDataStream.
 */
function isSystemIndex(name: string): boolean {
  // Include alert indices (these are regular indices, not data streams)
  if (name.startsWith('.internal.alerts')) return false;

  // Include Agent Builder conversations — AESOP analyzes conversation patterns
  // to discover skills from how analysts actually use the AI assistant
  if (name.startsWith('.chat-conversations')) return false;

  // Exclude system and Kibana internal indices
  return name.startsWith('.') || name.startsWith('_');
}

/**
 * Check if a data stream backing index should be excluded.
 * We never want backing indices — we use data stream names instead.
 */
function isBackingIndex(name: string): boolean {
  return name.startsWith('.ds-');
}

/**
 * Check if a data stream should be excluded from discovery.
 */
function isExcludedDataStream(name: string): boolean {
  const excludedPatterns = [
    '.kibana',
    '.fleet',
    '.monitoring',
    '.transform',
    '.profiling',
    'synthetics-',
    'elastic-connectors',
  ];
  return excludedPatterns.some((p) => name.startsWith(p));
}

/**
 * Sample a data source to determine type, doc count, field structure, and age range.
 * Works for both data streams and regular indices — ES handles the routing.
 */
async function sampleIndex(
  esClient: IScopedClusterClient,
  logger: Logger,
  name: string,
  isDataStream: boolean
): Promise<IndexInfo | null> {
  try {
    // asCurrentUser ensures we never sample documents from indices the
    // caller would not normally be able to read.
    const countResponse = await esClient.asCurrentUser.count({ index: name });
    const docCount = countResponse.count;

    if (docCount === 0) {
      logger.debug(`[AESOP] Skipping empty source: ${name}`);
      return null;
    }

    // Sample documents to extract field names and timestamps
    const sampleResponse = await esClient.asCurrentUser.search({
      index: name,
      size: 100,
      _source: true,
    });

    const fields = extractFieldsFromDocs(sampleResponse.hits.hits);

    const timestamps = sampleResponse.hits.hits
      .map((hit) => {
        const source = hit._source as JsonObject | undefined;
        const ts = source?.['@timestamp'];
        return typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) : null;
      })
      .filter((t): t is Date => t !== null && !Number.isNaN(t.getTime()));

    const type = categorizeIndex(name);
    const relevanceScore = calculateRelevanceScore(name, docCount, type);

    return {
      name,
      type,
      isDataStream,
      docCount,
      ageRange: {
        oldest:
          timestamps.length > 0
            ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
            : new Date(),
        newest:
          timestamps.length > 0
            ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
            : new Date(),
      },
      fields,
      relevanceScore,
    };
  } catch (error) {
    logger.debug(`[AESOP] Error sampling ${name}:`, error);
    return null;
  }
}

/**
 * Extract unique field names from sampled documents.
 */
function extractFieldsFromDocs(hits: Array<SearchHit<unknown>>): string[] {
  const fields = new Set<string>();

  for (const hit of hits) {
    const source = hit._source as JsonObject | undefined;
    if (source) extractFieldsRecursive(source, '', fields);
  }

  return Array.from(fields).sort();
}

/**
 * Recursively extract field names from nested objects (dot notation).
 */
function extractFieldsRecursive(obj: unknown, prefix: string, fields: Set<string>): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      fields.add(fieldName);

      // Recurse for nested objects (but limit depth)
      if (typeof value === 'object' && !Array.isArray(value) && fieldName.split('.').length < 5) {
        extractFieldsRecursive(value, fieldName, fields);
      }
    }
  }
}
