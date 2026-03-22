/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  COMPLIANCE_FINDINGS_DATA_STREAM,
  COMPLIANCE_FINDINGS_LATEST_INDEX,
} from '../../../common/compliance/constants';

export interface TransformConfig {
  transformId: string;
  description: string;
  sourceIndex: string;
  destIndex: string;
  frequency: string;
  syncDelay?: string;
}

/**
 * Service for managing Elasticsearch transforms for compliance findings deduplication.
 * Creates and manages the findings_latest transform that maintains the most recent
 * finding per host+rule combination.
 */
export class ComplianceTransformService {
  private readonly transformId = 'endpoint_compliance_findings_latest';

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /**
   * Creates the findings_latest transform that deduplicates findings by host+rule,
   * keeping only the most recent finding for each combination.
   */
  async createFindingsLatestTransform(): Promise<void> {
    const transformConfig = this.getFindingsLatestTransformConfig();

    try {
      // Check if transform already exists
      const existingTransform = await this.getTransform(this.transformId);
      if (existingTransform) {
        this.logger.debug(`Transform ${this.transformId} already exists, skipping creation`);
        return;
      }

      // Create the transform
      await this.esClient.transform.putTransform({
        transform_id: this.transformId,
        body: {
          description: transformConfig.description,
          source: {
            index: transformConfig.sourceIndex,
            query: {
              bool: {
                filter: [
                  {
                    exists: {
                      field: 'rule.id',
                    },
                  },
                  {
                    exists: {
                      field: 'host.id',
                    },
                  },
                ],
              },
            },
          },
          dest: {
            index: transformConfig.destIndex,
          },
          frequency: transformConfig.frequency,
          sync: {
            time: {
              field: '@timestamp',
              delay: transformConfig.syncDelay || '60s',
            },
          },
          pivot: {
            group_by: {
              'rule.id': {
                terms: {
                  field: 'rule.id',
                },
              },
              'host.id': {
                terms: {
                  field: 'host.id',
                },
              },
            },
            aggregations: {
              latest_finding: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  size: 1,
                },
              },
              '@timestamp': {
                max: {
                  field: '@timestamp',
                },
              },
              'result.evaluation': {
                terms: {
                  field: 'result.evaluation',
                },
              },
              'rule.name': {
                terms: {
                  field: 'rule.name.keyword',
                },
              },
              'rule.benchmark.id': {
                terms: {
                  field: 'rule.benchmark.id',
                },
              },
              'rule.section': {
                terms: {
                  field: 'rule.section',
                },
              },
              'host.name': {
                terms: {
                  field: 'host.name.keyword',
                },
              },
              'host.os.family': {
                terms: {
                  field: 'host.os.family',
                },
              },
            },
          },
          settings: {
            max_page_search_size: 5000,
            docs_per_second: 1000,
          },
        },
      });

      this.logger.info(`Successfully created transform: ${this.transformId}`);
    } catch (error) {
      this.logger.error(`Failed to create transform ${this.transformId}:`, error);
      throw new Error(`Transform creation failed: ${error.message}`);
    }
  }

  /**
   * Starts the findings_latest transform
   */
  async startTransform(): Promise<void> {
    try {
      const transformStats = await this.getTransformStats(this.transformId);
      if (transformStats?.state === 'started') {
        this.logger.debug(`Transform ${this.transformId} is already running`);
        return;
      }

      await this.esClient.transform.startTransform({
        transform_id: this.transformId,
      });

      this.logger.info(`Successfully started transform: ${this.transformId}`);
    } catch (error) {
      this.logger.error(`Failed to start transform ${this.transformId}:`, error);
      throw new Error(`Transform start failed: ${error.message}`);
    }
  }

  /**
   * Stops the findings_latest transform
   */
  async stopTransform(): Promise<void> {
    try {
      const transformStats = await this.getTransformStats(this.transformId);
      if (transformStats?.state === 'stopped') {
        this.logger.debug(`Transform ${this.transformId} is already stopped`);
        return;
      }

      await this.esClient.transform.stopTransform({
        transform_id: this.transformId,
        wait_for_completion: true,
        timeout: '30s',
      });

      this.logger.info(`Successfully stopped transform: ${this.transformId}`);
    } catch (error) {
      this.logger.error(`Failed to stop transform ${this.transformId}:`, error);
      throw new Error(`Transform stop failed: ${error.message}`);
    }
  }

  /**
   * Deletes the findings_latest transform and its destination index
   */
  async deleteTransform(): Promise<void> {
    try {
      // Stop transform if running
      await this.stopTransform();

      // Delete the transform
      await this.esClient.transform.deleteTransform({
        transform_id: this.transformId,
      });

      this.logger.info(`Successfully deleted transform: ${this.transformId}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.debug(`Transform ${this.transformId} not found, skipping deletion`);
        return;
      }
      this.logger.error(`Failed to delete transform ${this.transformId}:`, error);
      throw new Error(`Transform deletion failed: ${error.message}`);
    }
  }

  /**
   * Gets transform configuration details
   */
  async getTransform(transformId: string): Promise<any> {
    try {
      const response = await this.esClient.transform.getTransform({
        transform_id: transformId,
      });
      return response.transforms?.[0];
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Gets transform statistics and health information
   */
  async getTransformStats(transformId: string): Promise<any> {
    try {
      const response = await this.esClient.transform.getTransformStats({
        transform_id: transformId,
      });
      return response.transforms?.[0];
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Validates transform health and performance
   */
  async validateTransformHealth(): Promise<{
    isHealthy: boolean;
    stats: any;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const stats = await this.getTransformStats(this.transformId);
      
      if (!stats) {
        return {
          isHealthy: false,
          stats: null,
          issues: ['Transform does not exist'],
        };
      }

      // Check if transform is running
      if (stats.state !== 'started') {
        issues.push(`Transform is not running (state: ${stats.state})`);
      }

      // Check for errors
      if (stats.stats?.search_failures > 0) {
        issues.push(`Transform has ${stats.stats.search_failures} search failures`);
      }

      if (stats.stats?.index_failures > 0) {
        issues.push(`Transform has ${stats.stats.index_failures} index failures`);
      }

      // Check processing time
      if (stats.stats?.processing_time_in_ms > 60000) {
        issues.push(`Transform processing time is high: ${stats.stats.processing_time_in_ms}ms`);
      }

      // Check checkpoint progress
      const checkpointProgress = stats.checkpointing?.last?.checkpoint_progress?.percent_complete;
      if (checkpointProgress !== undefined && checkpointProgress < 100) {
        this.logger.debug(`Transform checkpoint progress: ${checkpointProgress}%`);
      }

      return {
        isHealthy: issues.length === 0,
        stats,
        issues,
      };
    } catch (error) {
      return {
        isHealthy: false,
        stats: null,
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }

  /**
   * Forces a manual transform checkpoint update
   */
  async updateTransform(): Promise<void> {
    try {
      await this.esClient.transform.updateTransform({
        transform_id: this.transformId,
        body: {
          sync: {
            time: {
              field: '@timestamp',
              delay: '60s',
            },
          },
        },
      });

      this.logger.info(`Successfully updated transform: ${this.transformId}`);
    } catch (error) {
      this.logger.error(`Failed to update transform ${this.transformId}:`, error);
      throw new Error(`Transform update failed: ${error.message}`);
    }
  }

  /**
   * Returns the default transform configuration
   */
  private getFindingsLatestTransformConfig(): TransformConfig {
    return {
      transformId: this.transformId,
      description: 'Deduplicates compliance findings by host+rule, keeping only the latest finding',
      sourceIndex: COMPLIANCE_FINDINGS_DATA_STREAM,
      destIndex: COMPLIANCE_FINDINGS_LATEST_INDEX,
      frequency: '1m', // Run every minute
      syncDelay: '60s', // Wait 60s after @timestamp for late-arriving data
    };
  }
}