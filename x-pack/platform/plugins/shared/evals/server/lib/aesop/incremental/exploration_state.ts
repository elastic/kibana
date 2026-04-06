/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Exploration State Persistence
 *
 * Enables incremental exploration by persisting state between runs.
 * State includes discovered indices, relationships, patterns, and skills.
 *
 * This allows daily updates instead of full re-scans, reducing exploration time
 * and LLM costs while maintaining accuracy.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * State snapshot from a single exploration run
 */
export interface ExplorationState {
  /** Timestamp when this exploration completed */
  last_run_timestamp: string;

  /** Indices discovered and analyzed in this exploration */
  discovered_indices: string[];

  /** Relationships discovered between indices */
  discovered_relationships: Array<{
    from: string;
    to: string;
    via: string;
    confidence: number;
  }>;

  /** Query patterns discovered and their frequencies */
  discovered_patterns: Array<{
    pattern_id: string;
    frequency: number;
    description: string;
  }>;

  /** IDs of skills generated from this exploration */
  generated_skills: string[];

  /** Percentage of environment explored (0-100) */
  discovery_coverage: number;

  /** Total runtime in milliseconds */
  total_runtime_ms: number;

  /** Document counts per index at time of exploration */
  index_doc_counts: Record<string, number>;

  /** Mapping fingerprints to detect schema changes */
  index_mapping_fingerprints: Record<string, string>;
}

/**
 * Configuration for state history retention
 */
export interface StateHistoryConfig {
  /** Maximum number of historical states to retain */
  maxHistorySize: number;

  /** Retention period in days */
  retentionDays: number;
}

const DEFAULT_HISTORY_CONFIG: StateHistoryConfig = {
  maxHistorySize: 30,
  retentionDays: 90,
};

const STATE_INDEX = '.aesop-exploration-state';
const STATE_ID_PREFIX = 'state-';
const LATEST_STATE_ID = 'latest';

/**
 * Service for persisting and retrieving exploration state
 */
export class ExplorationStateService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly historyConfig: StateHistoryConfig = DEFAULT_HISTORY_CONFIG
  ) {}

  /**
   * Save exploration state to Elasticsearch
   *
   * Creates two documents:
   * 1. Timestamped historical record (state-{timestamp})
   * 2. Pointer to latest state (id: 'latest')
   *
   * @param state - The exploration state to persist
   * @throws {Error} If save operation fails
   */
  async saveState(state: ExplorationState): Promise<void> {
    const timestamp = new Date().toISOString();
    const stateWithTimestamp = {
      ...state,
      saved_at: timestamp,
    };

    try {
      await this.ensureIndexExists();

      // Save timestamped historical record
      const historicalId = `${STATE_ID_PREFIX}${timestamp}`;
      await this.esClient.index({
        index: STATE_INDEX,
        id: historicalId,
        document: stateWithTimestamp,
        refresh: 'wait_for',
      });

      // Update latest pointer
      await this.esClient.index({
        index: STATE_INDEX,
        id: LATEST_STATE_ID,
        document: {
          ...stateWithTimestamp,
          historical_id: historicalId,
        },
        refresh: 'wait_for',
      });

      this.logger.info(
        `[AESOP State] Saved exploration state timestamp=${timestamp} indices_count=${state.discovered_indices.length} relationships_count=${state.discovered_relationships.length} patterns_count=${state.discovered_patterns.length} skills_count=${state.generated_skills.length} coverage=${state.discovery_coverage}`
      );

      // Cleanup old states
      await this.cleanupOldStates();
    } catch (error) {
      this.logger.error(`[AESOP State] Failed to save exploration state`, error);
      throw new Error(`Failed to save exploration state: ${error.message}`);
    }
  }

  /**
   * Load the most recent exploration state
   *
   * @returns The latest state, or null if no state exists (first run)
   */
  async loadLastState(): Promise<ExplorationState | null> {
    try {
      await this.ensureIndexExists();

      const result = await this.esClient.get({
        index: STATE_INDEX,
        id: LATEST_STATE_ID,
      });

      const state = result._source as ExplorationState & { saved_at: string };

      this.logger.info(
        `[AESOP State] Loaded last exploration state timestamp=${state.saved_at} indices_count=${
          state.discovered_indices.length
        } age_hours=${this.calculateAgeHours(state.saved_at)}`
      );

      return state;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.info(`[AESOP State] No previous state found - first exploration`);
        return null;
      }

      this.logger.error(`[AESOP State] Failed to load last state`, error);
      throw new Error(`Failed to load exploration state: ${error.message}`);
    }
  }

  /**
   * Get historical states ordered by timestamp
   *
   * @param limit - Maximum number of states to return
   * @returns Array of historical states, newest first
   */
  async getStateHistory(
    limit: number = 10
  ): Promise<Array<ExplorationState & { saved_at: string }>> {
    try {
      await this.ensureIndexExists();

      const result = await this.esClient.search({
        index: STATE_INDEX,
        size: limit,
        sort: [{ saved_at: 'desc' }],
        query: {
          bool: {
            must_not: {
              term: { _id: LATEST_STATE_ID },
            },
          },
        },
      });

      const states = result.hits.hits.map(
        (hit) => hit._source as ExplorationState & { saved_at: string }
      );

      this.logger.debug(`[AESOP State] Retrieved ${states.length} historical states`);

      return states;
    } catch (error) {
      this.logger.error(`[AESOP State] Failed to get state history`, error);
      throw new Error(`Failed to get state history: ${error.message}`);
    }
  }

  /**
   * Compare current state with previous state to identify changes
   *
   * @param current - Current exploration state
   * @param previous - Previous exploration state
   * @returns Summary of changes between states
   */
  compareStates(
    current: ExplorationState,
    previous: ExplorationState
  ): {
    new_indices: string[];
    removed_indices: string[];
    new_relationships: number;
    new_patterns: number;
    new_skills: number;
    coverage_delta: number;
  } {
    const previousIndicesSet = new Set(previous.discovered_indices);
    const currentIndicesSet = new Set(current.discovered_indices);

    const newIndices = current.discovered_indices.filter((idx) => !previousIndicesSet.has(idx));
    const removedIndices = previous.discovered_indices.filter((idx) => !currentIndicesSet.has(idx));

    const previousRelationshipKeys = new Set(
      previous.discovered_relationships.map((r) => `${r.from}:${r.to}:${r.via}`)
    );
    const newRelationships = current.discovered_relationships.filter(
      (r) => !previousRelationshipKeys.has(`${r.from}:${r.to}:${r.via}`)
    );

    const previousPatternIds = new Set(previous.discovered_patterns.map((p) => p.pattern_id));
    const newPatterns = current.discovered_patterns.filter(
      (p) => !previousPatternIds.has(p.pattern_id)
    );

    const previousSkillIds = new Set(previous.generated_skills);
    const newSkills = current.generated_skills.filter((skillId) => !previousSkillIds.has(skillId));

    return {
      new_indices: newIndices,
      removed_indices: removedIndices,
      new_relationships: newRelationships.length,
      new_patterns: newPatterns.length,
      new_skills: newSkills.length,
      coverage_delta: current.discovery_coverage - previous.discovery_coverage,
    };
  }

  /**
   * Ensure state index exists with proper mappings
   */
  async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.esClient.indices.exists({
        index: STATE_INDEX,
      });

      if (exists) {
        return;
      }

      await this.esClient.indices.create({
        index: STATE_INDEX,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          'index.hidden': true,
        },
        mappings: {
          properties: {
            last_run_timestamp: { type: 'date' },
            saved_at: { type: 'date' },
            historical_id: { type: 'keyword' },
            discovered_indices: { type: 'keyword' },
            discovered_relationships: {
              type: 'nested',
              properties: {
                from: { type: 'keyword' },
                to: { type: 'keyword' },
                via: { type: 'keyword' },
                confidence: { type: 'float' },
              },
            },
            discovered_patterns: {
              type: 'nested',
              properties: {
                pattern_id: { type: 'keyword' },
                frequency: { type: 'integer' },
                description: { type: 'text' },
              },
            },
            generated_skills: { type: 'keyword' },
            discovery_coverage: { type: 'float' },
            total_runtime_ms: { type: 'long' },
            index_doc_counts: { type: 'object' },
            index_mapping_fingerprints: { type: 'object' },
          },
        },
      });

      this.logger.info(`[AESOP State] Created state index: ${STATE_INDEX}`);
    } catch (error) {
      if (!this.isResourceAlreadyExistsError(error)) {
        throw error;
      }
    }
  }

  /**
   * Remove old states beyond retention policy
   */
  private async cleanupOldStates(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.historyConfig.retentionDays);

      const result = await this.esClient.deleteByQuery({
        index: STATE_INDEX,
        query: {
          bool: {
            must: [
              {
                range: {
                  saved_at: {
                    lt: cutoffDate.toISOString(),
                  },
                },
              },
            ],
            must_not: {
              term: { _id: LATEST_STATE_ID },
            },
          },
        },
      });

      if (result.deleted && result.deleted > 0) {
        this.logger.info(
          `[AESOP State] Cleaned up ${result.deleted} old states older than ${this.historyConfig.retentionDays} days`
        );
      }
    } catch (error) {
      this.logger.warn(`[AESOP State] Failed to cleanup old states (non-critical)`, error);
    }
  }

  /**
   * Calculate age of state in hours
   */
  private calculateAgeHours(timestamp: string): number {
    const age = Date.now() - new Date(timestamp).getTime();
    return Math.round(age / (1000 * 60 * 60));
  }

  /**
   * Check if error is a 404 Not Found
   */
  private isNotFoundError(error: any): boolean {
    return error.statusCode === 404 || error.meta?.statusCode === 404;
  }

  /**
   * Check if error is a 400 Resource Already Exists
   */
  private isResourceAlreadyExistsError(error: any): boolean {
    return (
      error.statusCode === 400 ||
      error.meta?.statusCode === 400 ||
      error.message?.includes('resource_already_exists_exception')
    );
  }
}

/**
 * Initialize exploration state index on plugin start
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 */
export async function initializeExplorationStateIndex(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  const service = new ExplorationStateService(esClient, logger);
  await service.ensureIndexExists();
  logger.info(`[AESOP State] Exploration state persistence initialized`);
}
