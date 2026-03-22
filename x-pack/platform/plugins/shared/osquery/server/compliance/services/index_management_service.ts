/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getFindingsLatestIndexTemplate } from '../create_indices/findings_latest_template';
import { getFindingsLatestIlmPolicy } from '../create_indices/findings_latest_ilm_policy';
import { COMPLIANCE_FINDINGS_LATEST_INDEX } from '../../../common/compliance/constants';

/**
 * Service for managing Elasticsearch indices, templates, and ILM policies
 * for compliance findings deduplication infrastructure.
 */
export class ComplianceIndexManagementService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /**
   * Deploys all required index templates and ILM policies for findings_latest
   */
  async deployFindingsLatestInfrastructure(): Promise<void> {
    try {
      // Deploy ILM policy first (template references it)
      await this.deployFindingsLatestIlmPolicy();
      
      // Deploy index template
      await this.deployFindingsLatestTemplate();
      
      // Create initial index if it doesn't exist
      await this.createFindingsLatestIndex();

      this.logger.info('Successfully deployed findings_latest infrastructure');
    } catch (error) {
      this.logger.error('Failed to deploy findings_latest infrastructure:', error);
      throw new Error(`Infrastructure deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploys the ILM policy for findings_latest indices
   */
  async deployFindingsLatestIlmPolicy(): Promise<void> {
    const policy = getFindingsLatestIlmPolicy();
    
    try {
      // Check if policy already exists
      const existingPolicy = await this.getIlmPolicy(policy.name);
      if (existingPolicy) {
        this.logger.debug(`ILM policy ${policy.name} already exists, updating...`);
      }

      await this.esClient.ilm.putLifecycle(policy);
      this.logger.info(`Successfully deployed ILM policy: ${policy.name}`);
    } catch (error) {
      this.logger.error(`Failed to deploy ILM policy ${policy.name}:`, error);
      throw new Error(`ILM policy deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploys the index template for findings_latest indices
   */
  async deployFindingsLatestTemplate(): Promise<void> {
    const template = getFindingsLatestIndexTemplate();
    
    try {
      // Check if template already exists
      const existingTemplate = await this.getIndexTemplate(template.name);
      if (existingTemplate) {
        this.logger.debug(`Index template ${template.name} already exists, updating...`);
      }

      await this.esClient.indices.putIndexTemplate(template);
      this.logger.info(`Successfully deployed index template: ${template.name}`);
    } catch (error) {
      this.logger.error(`Failed to deploy index template ${template.name}:`, error);
      throw new Error(`Index template deployment failed: ${error.message}`);
    }
  }

  /**
   * Creates the initial findings_latest index if it doesn't exist
   */
  async createFindingsLatestIndex(): Promise<void> {
    const indexName = `${COMPLIANCE_FINDINGS_LATEST_INDEX}-000001`;
    
    try {
      const indexExists = await this.esClient.indices.exists({
        index: indexName,
      });

      if (indexExists) {
        this.logger.debug(`Index ${indexName} already exists, skipping creation`);
        return;
      }

      await this.esClient.indices.create({
        index: indexName,
        body: {
          aliases: {
            [COMPLIANCE_FINDINGS_LATEST_INDEX]: {
              is_write_index: true,
            },
          },
        },
      });

      this.logger.info(`Successfully created initial index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to create initial index ${indexName}:`, error);
      throw new Error(`Index creation failed: ${error.message}`);
    }
  }

  /**
   * Removes all findings_latest infrastructure (templates, policies, indices)
   */
  async cleanupFindingsLatestInfrastructure(): Promise<void> {
    try {
      // Delete indices
      await this.deleteFindingsLatestIndices();
      
      // Delete template
      await this.deleteIndexTemplate('endpoint_compliance_findings_latest');
      
      // Delete ILM policy
      await this.deleteIlmPolicy('endpoint_compliance_findings_latest_policy');

      this.logger.info('Successfully cleaned up findings_latest infrastructure');
    } catch (error) {
      this.logger.error('Failed to cleanup findings_latest infrastructure:', error);
      throw new Error(`Infrastructure cleanup failed: ${error.message}`);
    }
  }

  /**
   * Deletes all findings_latest indices
   */
  async deleteFindingsLatestIndices(): Promise<void> {
    try {
      const indexPattern = `${COMPLIANCE_FINDINGS_LATEST_INDEX}*`;
      
      const indexExists = await this.esClient.indices.exists({
        index: indexPattern,
      });

      if (!indexExists) {
        this.logger.debug(`No indices found matching pattern: ${indexPattern}`);
        return;
      }

      await this.esClient.indices.delete({
        index: indexPattern,
      });

      this.logger.info(`Successfully deleted indices: ${indexPattern}`);
    } catch (error) {
      this.logger.error('Failed to delete findings_latest indices:', error);
      throw new Error(`Index deletion failed: ${error.message}`);
    }
  }

  /**
   * Gets ILM policy details
   */
  async getIlmPolicy(policyName: string): Promise<any> {
    try {
      const response = await this.esClient.ilm.getLifecycle({
        name: policyName,
      });
      return response[policyName];
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Gets index template details
   */
  async getIndexTemplate(templateName: string): Promise<any> {
    try {
      const response = await this.esClient.indices.getIndexTemplate({
        name: templateName,
      });
      return response.index_templates?.[0];
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes an index template
   */
  async deleteIndexTemplate(templateName: string): Promise<void> {
    try {
      await this.esClient.indices.deleteIndexTemplate({
        name: templateName,
      });
      this.logger.info(`Successfully deleted index template: ${templateName}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.debug(`Index template ${templateName} not found, skipping deletion`);
        return;
      }
      this.logger.error(`Failed to delete index template ${templateName}:`, error);
      throw new Error(`Template deletion failed: ${error.message}`);
    }
  }

  /**
   * Deletes an ILM policy
   */
  async deleteIlmPolicy(policyName: string): Promise<void> {
    try {
      await this.esClient.ilm.deleteLifecycle({
        name: policyName,
      });
      this.logger.info(`Successfully deleted ILM policy: ${policyName}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.debug(`ILM policy ${policyName} not found, skipping deletion`);
        return;
      }
      this.logger.error(`Failed to delete ILM policy ${policyName}:`, error);
      throw new Error(`Policy deletion failed: ${error.message}`);
    }
  }

  /**
   * Validates findings_latest infrastructure health
   */
  async validateInfrastructureHealth(): Promise<{
    isHealthy: boolean;
    components: {
      ilmPolicy: { exists: boolean; name: string };
      indexTemplate: { exists: boolean; name: string };
      indices: { exists: boolean; count: number; names: string[] };
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const components = {
      ilmPolicy: { exists: false, name: 'endpoint_compliance_findings_latest_policy' },
      indexTemplate: { exists: false, name: 'endpoint_compliance_findings_latest' },
      indices: { exists: false, count: 0, names: [] as string[] },
    };

    try {
      // Check ILM policy
      const ilmPolicy = await this.getIlmPolicy(components.ilmPolicy.name);
      components.ilmPolicy.exists = !!ilmPolicy;
      if (!ilmPolicy) {
        issues.push('ILM policy is missing');
      }

      // Check index template
      const indexTemplate = await this.getIndexTemplate(components.indexTemplate.name);
      components.indexTemplate.exists = !!indexTemplate;
      if (!indexTemplate) {
        issues.push('Index template is missing');
      }

      // Check indices
      const indexPattern = `${COMPLIANCE_FINDINGS_LATEST_INDEX}*`;
      const indicesResponse = await this.esClient.cat.indices({
        index: indexPattern,
        format: 'json',
        h: 'index,health,status',
      });

      if (Array.isArray(indicesResponse)) {
        components.indices.exists = indicesResponse.length > 0;
        components.indices.count = indicesResponse.length;
        components.indices.names = indicesResponse.map((idx: any) => idx.index);

        // Check index health
        indicesResponse.forEach((idx: any) => {
          if (idx.health === 'red') {
            issues.push(`Index ${idx.index} is in red health state`);
          } else if (idx.health === 'yellow') {
            issues.push(`Index ${idx.index} is in yellow health state`);
          }
        });
      }

      if (!components.indices.exists) {
        issues.push('No findings_latest indices found');
      }

      return {
        isHealthy: issues.length === 0,
        components,
        issues,
      };
    } catch (error) {
      return {
        isHealthy: false,
        components,
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }
}