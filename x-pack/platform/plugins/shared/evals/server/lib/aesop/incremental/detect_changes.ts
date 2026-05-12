/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Change Detection
 *
 * Detects changes in the Elasticsearch environment to enable incremental exploration:
 * - New indices created since last exploration
 * - Modified indices (mapping changes, significant data growth)
 * - New documents added to existing indices
 *
 * This allows AESOP to focus exploration effort on what changed, reducing runtime
 * from hours to minutes for daily updates.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createHash } from 'crypto';
import type { ExplorationState } from './exploration_state';

/**
 * Result of change detection analysis
 */
export interface ChangeDetectionResult {
  /** Indices created since last exploration */
  new_indices: string[];

  /** Indices with mapping or significant data changes */
  modified_indices: string[];

  /** Indices that existed before but no longer exist */
  removed_indices: string[];

  /** New document counts per index since last exploration */
  new_document_counts: Record<string, number>;

  /** Total new documents across all indices */
  total_new_documents: number;

  /** Whether this is a full exploration (no previous state) */
  is_full_exploration: boolean;

  /** Timestamp of previous exploration */
  previous_exploration_timestamp?: string;
}

/**
 * Configuration for change detection thresholds
 */
export interface ChangeDetectionConfig {
  /** Percentage increase in doc count to mark as "modified" (default: 20%) */
  docCountChangeThreshold: number;

  /** Maximum indices to analyze in detail (default: 1000) */
  maxIndicesToAnalyze: number;

  /** Whether to check mapping changes (can be expensive) */
  checkMappingChanges: boolean;
}

const DEFAULT_CONFIG: ChangeDetectionConfig = {
  docCountChangeThreshold: 0.2, // 20%
  maxIndicesToAnalyze: 1000,
  checkMappingChanges: true,
};

/**
 * Service for detecting changes in Elasticsearch environment
 */
export class ChangeDetector {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly config: ChangeDetectionConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Detect all changes since last exploration
   *
   * Analyzes indices matching scoped patterns and compares with previous state
   * to identify new, modified, and removed indices.
   *
   * @param scopedPatterns - Index patterns to analyze (e.g., ['logs-*', 'metrics-*'])
   * @param lastState - Previous exploration state, or null for first run
   * @returns Comprehensive change detection result
   */
  async detectChanges(
    scopedPatterns: string[],
    lastState: ExplorationState | null
  ): Promise<ChangeDetectionResult> {
    const startTime = Date.now();

    // If no previous state, this is a full exploration
    if (!lastState) {
      const allIndices = await this.getAllMatchingIndices(scopedPatterns);
      this.logger.info(
        `[AESOP Changes] First exploration - analyzing all ${allIndices.length} indices`
      );

      return {
        new_indices: allIndices,
        modified_indices: [],
        removed_indices: [],
        new_document_counts: {},
        total_new_documents: 0,
        is_full_exploration: true,
      };
    }

    // Incremental exploration - detect what changed
    const [newIndices, modifiedIndices, removedIndices, newDocCounts] = await Promise.all([
      this.detectNewIndices(scopedPatterns, lastState),
      this.detectModifiedIndices(scopedPatterns, lastState),
      this.detectRemovedIndices(scopedPatterns, lastState),
      this.detectNewData(scopedPatterns, lastState),
    ]);

    const totalNewDocuments = Object.values(newDocCounts).reduce((sum, count) => sum + count, 0);

    const elapsed = Date.now() - startTime;

    this.logger.info(
      `[AESOP Changes] Change detection completed in ${elapsed}ms new_indices=${newIndices.length} modified_indices=${modifiedIndices.length} removed_indices=${removedIndices.length} total_new_documents=${totalNewDocuments} previous_exploration=${lastState.last_run_timestamp}`
    );

    return {
      new_indices: newIndices,
      modified_indices: modifiedIndices,
      removed_indices: removedIndices,
      new_document_counts: newDocCounts,
      total_new_documents: totalNewDocuments,
      is_full_exploration: false,
      previous_exploration_timestamp: lastState.last_run_timestamp,
    };
  }

  /**
   * Detect indices created since last exploration
   *
   * Compares current indices against discovered_indices from last state.
   *
   * @param scopedPatterns - Index patterns to check
   * @param lastState - Previous exploration state
   * @returns Array of new index names
   */
  async detectNewIndices(
    scopedPatterns: string[],
    lastState: ExplorationState | null
  ): Promise<string[]> {
    const currentIndices = await this.getAllMatchingIndices(scopedPatterns);

    if (!lastState) {
      return currentIndices;
    }

    const previousIndicesSet = new Set(lastState.discovered_indices);
    const newIndices = currentIndices.filter((idx) => !previousIndicesSet.has(idx));

    this.logger.debug(
      `[AESOP Changes] Found ${newIndices.length} new indices: ${newIndices.join(', ')}`
    );

    return newIndices;
  }

  /**
   * Detect indices with significant changes (mapping or data)
   *
   * An index is considered modified if:
   * - Mapping fingerprint changed (schema evolution)
   * - Document count increased by > threshold percentage
   *
   * @param scopedPatterns - Index patterns to check
   * @param lastState - Previous exploration state
   * @returns Array of modified index names
   */
  async detectModifiedIndices(
    scopedPatterns: string[],
    lastState: ExplorationState | null
  ): Promise<string[]> {
    if (!lastState) {
      return [];
    }

    const modifications: string[] = [];
    const currentIndices = await this.getAllMatchingIndices(scopedPatterns);

    // Only check indices that existed in previous state
    const existingIndices = currentIndices.filter((idx) =>
      lastState.discovered_indices.includes(idx)
    );

    // Limit to avoid overwhelming ES
    const indicesToCheck = existingIndices.slice(0, this.config.maxIndicesToAnalyze);

    if (indicesToCheck.length < existingIndices.length) {
      this.logger.warn(
        `[AESOP Changes] Limiting modification check to ${indicesToCheck.length}/${existingIndices.length} indices`
      );
    }

    // Check mapping changes
    if (this.config.checkMappingChanges) {
      const mappingChanges = await this.detectMappingChanges(indicesToCheck, lastState);
      modifications.push(...mappingChanges);
    }

    // Check document count changes
    const docCountChanges = await this.detectDocCountChanges(indicesToCheck, lastState);
    modifications.push(...docCountChanges);

    // Deduplicate
    const uniqueModifications = Array.from(new Set(modifications));

    this.logger.debug(
      `[AESOP Changes] Found ${
        uniqueModifications.length
      } modified indices: ${uniqueModifications.join(', ')}`
    );

    return uniqueModifications;
  }

  /**
   * Detect indices that existed before but are now gone
   *
   * @param scopedPatterns - Index patterns to check
   * @param lastState - Previous exploration state
   * @returns Array of removed index names
   */
  async detectRemovedIndices(
    scopedPatterns: string[],
    lastState: ExplorationState | null
  ): Promise<string[]> {
    if (!lastState) {
      return [];
    }

    const currentIndices = await this.getAllMatchingIndices(scopedPatterns);
    const currentIndicesSet = new Set(currentIndices);

    const removedIndices = lastState.discovered_indices.filter(
      (idx) => !currentIndicesSet.has(idx)
    );

    if (removedIndices.length > 0) {
      this.logger.warn(
        `[AESOP Changes] Detected ${removedIndices.length} removed indices: ${removedIndices.join(
          ', '
        )}`
      );
    }

    return removedIndices;
  }

  /**
   * Count new documents per index since last exploration
   *
   * Uses @timestamp field to filter documents created after last_run_timestamp.
   * Falls back to comparing total doc counts if @timestamp unavailable.
   *
   * @param scopedPatterns - Index patterns to check
   * @param lastState - Previous exploration state
   * @returns Map of index name to new document count
   */
  async detectNewData(
    scopedPatterns: string[],
    lastState: ExplorationState
  ): Promise<Record<string, number>> {
    const newDocCounts: Record<string, number> = {};
    const indices = await this.getAllMatchingIndices(scopedPatterns);

    // Limit to avoid overwhelming ES
    const indicesToCheck = indices.slice(0, this.config.maxIndicesToAnalyze);

    for (const index of indicesToCheck) {
      try {
        // Try timestamp-based counting first
        const timestampResult = await this.countDocumentsSinceTimestamp(
          index,
          lastState.last_run_timestamp
        );

        if (timestampResult !== null) {
          if (timestampResult > 0) {
            newDocCounts[index] = timestampResult;
          }
        } else {
          // Fallback: compare total doc counts
          const currentCount = await this.getDocumentCount(index);
          const previousCount = lastState.index_doc_counts[index] || 0;
          const delta = currentCount - previousCount;

          if (delta > 0) {
            newDocCounts[index] = delta;
          }
        }
      } catch (error) {
        this.logger.warn(`[AESOP Changes] Failed to count new documents in ${index}`, error);
      }
    }

    const totalNew = Object.values(newDocCounts).reduce((sum, count) => sum + count, 0);

    this.logger.debug(
      `[AESOP Changes] Counted ${totalNew} new documents across ${
        Object.keys(newDocCounts).length
      } indices`
    );

    return newDocCounts;
  }

  /**
   * Get all indices matching patterns
   */
  private async getAllMatchingIndices(patterns: string[]): Promise<string[]> {
    try {
      const result = await this.esClient.cat.indices({
        index: patterns.join(','),
        format: 'json',
        h: 'index',
      });

      return result.map((item: any) => item.index).sort();
    } catch (error) {
      if (this.isIndexNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Detect mapping changes by comparing fingerprints
   */
  private async detectMappingChanges(
    indices: string[],
    lastState: ExplorationState
  ): Promise<string[]> {
    const changes: string[] = [];

    try {
      const mappingsResult = await this.esClient.indices.getMapping({
        index: indices.join(','),
      });

      for (const [indexName, indexData] of Object.entries(mappingsResult)) {
        const currentFingerprint = this.calculateMappingFingerprint(indexData);
        const previousFingerprint = lastState.index_mapping_fingerprints[indexName];

        if (previousFingerprint && currentFingerprint !== previousFingerprint) {
          changes.push(indexName);
          this.logger.debug(
            `[AESOP Changes] Mapping changed for ${indexName} previous=${previousFingerprint.substring(
              0,
              8
            )} current=${currentFingerprint.substring(0, 8)}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(`[AESOP Changes] Failed to check mapping changes (non-critical)`, error);
    }

    return changes;
  }

  /**
   * Detect significant document count changes
   */
  private async detectDocCountChanges(
    indices: string[],
    lastState: ExplorationState
  ): Promise<string[]> {
    const changes: string[] = [];

    try {
      const statsResult = await this.esClient.indices.stats({
        index: indices.join(','),
        metric: ['docs'],
      });

      for (const [indexName, stats] of Object.entries(statsResult.indices || {})) {
        const currentCount = (stats as any).total?.docs?.count || 0;
        const previousCount = lastState.index_doc_counts[indexName] || 0;

        // Skip if no previous count (new index)
        if (previousCount === 0) {
          continue;
        }

        // Check if count increased beyond threshold
        const changeRatio = (currentCount - previousCount) / previousCount;
        if (changeRatio > this.config.docCountChangeThreshold) {
          changes.push(indexName);
          this.logger.debug(
            `[AESOP Changes] Doc count changed for ${indexName} previous=${previousCount} current=${currentCount} change_pct=${Math.round(
              changeRatio * 100
            )}`
          );
        }
      }
    } catch (error) {
      this.logger.warn(`[AESOP Changes] Failed to check doc count changes (non-critical)`, error);
    }

    return changes;
  }

  /**
   * Count documents created since timestamp using @timestamp field
   */
  private async countDocumentsSinceTimestamp(
    index: string,
    timestamp: string
  ): Promise<number | null> {
    try {
      const result = await this.esClient.count({
        index,
        query: {
          range: {
            '@timestamp': {
              gte: timestamp,
            },
          },
        },
      });

      return result.count;
    } catch (error) {
      // @timestamp field may not exist or may be named differently
      return null;
    }
  }

  /**
   * Get total document count for an index
   */
  private async getDocumentCount(index: string): Promise<number> {
    try {
      const result = await this.esClient.count({ index });
      return result.count;
    } catch (error) {
      this.logger.warn(`[AESOP Changes] Failed to get doc count for ${index}`, error);
      return 0;
    }
  }

  /**
   * Calculate fingerprint of index mapping for change detection
   */
  private calculateMappingFingerprint(indexData: any): string {
    // Normalize and hash mapping structure
    const mappings = indexData.mappings || {};
    const normalizedMapping = JSON.stringify(mappings, Object.keys(mappings).sort());
    return createHash('sha256').update(normalizedMapping).digest('hex');
  }

  /**
   * Check if error indicates index not found
   */
  private isIndexNotFoundError(error: any): boolean {
    return (
      error.statusCode === 404 ||
      error.meta?.statusCode === 404 ||
      error.message?.includes('index_not_found_exception')
    );
  }
}

/**
 * Create a summary of changes suitable for logging/reporting
 */
export function summarizeChanges(result: ChangeDetectionResult): string {
  if (result.is_full_exploration) {
    return `Full exploration: ${result.new_indices.length} indices`;
  }

  const parts: string[] = [];

  if (result.new_indices.length > 0) {
    parts.push(`${result.new_indices.length} new indices`);
  }

  if (result.modified_indices.length > 0) {
    parts.push(`${result.modified_indices.length} modified`);
  }

  if (result.removed_indices.length > 0) {
    parts.push(`${result.removed_indices.length} removed`);
  }

  if (result.total_new_documents > 0) {
    parts.push(`${result.total_new_documents.toLocaleString()} new docs`);
  }

  return parts.length > 0 ? `Incremental: ${parts.join(', ')}` : 'No changes detected';
}
