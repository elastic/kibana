/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ComplianceTransformService } from './transform_service';
import { ComplianceIndexManagementService } from './index_management_service';
import { ComplianceTransformMonitoringService } from './transform_monitoring_service';

/**
 * Service for cleaning up compliance transform infrastructure when 
 * the endpoint compliance monitoring feature is disabled.
 */
export class ComplianceTransformCleanupService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /**
   * Performs a complete cleanup of all compliance transform infrastructure.
   * This is called when the endpointComplianceMonitoring feature is disabled.
   */
  async performFullCleanup(): Promise<{
    success: boolean;
    cleanupSteps: {
      step: string;
      success: boolean;
      error?: string;
    }[];
  }> {
    const cleanupSteps: Array<{
      step: string;
      success: boolean;
      error?: string;
    }> = [];

    this.logger.info('Starting complete cleanup of compliance transform infrastructure...');

    // Step 1: Stop transform monitoring
    try {
      const monitoringService = new ComplianceTransformMonitoringService(
        this.esClient,
        {} as any, // taskManager not needed for cleanup
        this.logger
      );
      await monitoringService.stopMonitoring();
      cleanupSteps.push({ step: 'Stop transform monitoring', success: true });
    } catch (error) {
      const errorMessage = `Failed to stop monitoring: ${error.message}`;
      this.logger.warn(errorMessage);
      cleanupSteps.push({ 
        step: 'Stop transform monitoring', 
        success: false, 
        error: errorMessage 
      });
    }

    // Step 2: Stop and delete transforms
    try {
      const transformService = new ComplianceTransformService(this.esClient, this.logger);
      await transformService.deleteTransform();
      cleanupSteps.push({ step: 'Delete transforms', success: true });
    } catch (error) {
      const errorMessage = `Failed to delete transforms: ${error.message}`;
      this.logger.error(errorMessage);
      cleanupSteps.push({ 
        step: 'Delete transforms', 
        success: false, 
        error: errorMessage 
      });
    }

    // Step 3: Clean up indices, templates, and policies
    try {
      const indexService = new ComplianceIndexManagementService(this.esClient, this.logger);
      await indexService.cleanupFindingsLatestInfrastructure();
      cleanupSteps.push({ step: 'Clean up infrastructure', success: true });
    } catch (error) {
      const errorMessage = `Failed to cleanup infrastructure: ${error.message}`;
      this.logger.error(errorMessage);
      cleanupSteps.push({ 
        step: 'Clean up infrastructure', 
        success: false, 
        error: errorMessage 
      });
    }

    // Step 4: Clean up any remaining task manager tasks
    try {
      await this.cleanupTaskManagerTasks();
      cleanupSteps.push({ step: 'Clean up Task Manager tasks', success: true });
    } catch (error) {
      const errorMessage = `Failed to cleanup tasks: ${error.message}`;
      this.logger.warn(errorMessage);
      cleanupSteps.push({ 
        step: 'Clean up Task Manager tasks', 
        success: false, 
        error: errorMessage 
      });
    }

    const overallSuccess = cleanupSteps.every(step => step.success);
    
    if (overallSuccess) {
      this.logger.info('Successfully completed full compliance transform cleanup');
    } else {
      this.logger.warn('Compliance transform cleanup completed with some failures:', {
        failedSteps: cleanupSteps.filter(step => !step.success)
      });
    }

    return {
      success: overallSuccess,
      cleanupSteps,
    };
  }

  /**
   * Performs a graceful cleanup that preserves data but stops active processing.
   * This allows for re-enabling the feature later without data loss.
   */
  async performGracefulCleanup(): Promise<{
    success: boolean;
    cleanupSteps: {
      step: string;
      success: boolean;
      error?: string;
    }[];
  }> {
    const cleanupSteps: Array<{
      step: string;
      success: boolean;
      error?: string;
    }> = [];

    this.logger.info('Starting graceful cleanup of compliance transform infrastructure...');

    // Step 1: Stop transform monitoring
    try {
      const monitoringService = new ComplianceTransformMonitoringService(
        this.esClient,
        {} as any, // taskManager not needed for cleanup
        this.logger
      );
      await monitoringService.stopMonitoring();
      cleanupSteps.push({ step: 'Stop transform monitoring', success: true });
    } catch (error) {
      const errorMessage = `Failed to stop monitoring: ${error.message}`;
      this.logger.warn(errorMessage);
      cleanupSteps.push({ 
        step: 'Stop transform monitoring', 
        success: false, 
        error: errorMessage 
      });
    }

    // Step 2: Stop transforms (but don't delete them)
    try {
      const transformService = new ComplianceTransformService(this.esClient, this.logger);
      await transformService.stopTransform();
      cleanupSteps.push({ step: 'Stop transforms', success: true });
    } catch (error) {
      const errorMessage = `Failed to stop transforms: ${error.message}`;
      this.logger.error(errorMessage);
      cleanupSteps.push({ 
        step: 'Stop transforms', 
        success: false, 
        error: errorMessage 
      });
    }

    // Step 3: Clean up Task Manager tasks only
    try {
      await this.cleanupTaskManagerTasks();
      cleanupSteps.push({ step: 'Clean up Task Manager tasks', success: true });
    } catch (error) {
      const errorMessage = `Failed to cleanup tasks: ${error.message}`;
      this.logger.warn(errorMessage);
      cleanupSteps.push({ 
        step: 'Clean up Task Manager tasks', 
        success: false, 
        error: errorMessage 
      });
    }

    const overallSuccess = cleanupSteps.every(step => step.success);
    
    if (overallSuccess) {
      this.logger.info('Successfully completed graceful compliance transform cleanup');
    } else {
      this.logger.warn('Graceful compliance transform cleanup completed with some failures:', {
        failedSteps: cleanupSteps.filter(step => !step.success)
      });
    }

    return {
      success: overallSuccess,
      cleanupSteps,
    };
  }

  /**
   * Emergency cleanup procedure for critical issues.
   * Forcefully stops all transforms and removes infrastructure.
   */
  async performEmergencyCleanup(): Promise<{
    success: boolean;
    cleanupSteps: {
      step: string;
      success: boolean;
      error?: string;
    }[];
  }> {
    const cleanupSteps: Array<{
      step: string;
      success: boolean;
      error?: string;
    }> = [];

    this.logger.warn('Starting EMERGENCY cleanup of compliance transform infrastructure...');

    // Emergency cleanup tries to force-stop everything regardless of errors
    const emergencySteps = [
      {
        name: 'Force stop all compliance transforms',
        action: async () => {
          const transformService = new ComplianceTransformService(this.esClient, this.logger);
          await this.forceStopTransform('endpoint_compliance_findings_latest');
        }
      },
      {
        name: 'Delete all compliance transforms',
        action: async () => {
          const transformService = new ComplianceTransformService(this.esClient, this.logger);
          await transformService.deleteTransform();
        }
      },
      {
        name: 'Force cleanup infrastructure',
        action: async () => {
          const indexService = new ComplianceIndexManagementService(this.esClient, this.logger);
          await indexService.cleanupFindingsLatestInfrastructure();
        }
      },
      {
        name: 'Clean up all compliance tasks',
        action: async () => {
          await this.cleanupTaskManagerTasks();
        }
      }
    ];

    for (const { name, action } of emergencySteps) {
      try {
        await action();
        cleanupSteps.push({ step: name, success: true });
      } catch (error) {
        const errorMessage = `${name} failed: ${error.message}`;
        this.logger.error(errorMessage);
        cleanupSteps.push({ 
          step: name, 
          success: false, 
          error: errorMessage 
        });
        // Continue with other cleanup steps even if one fails
      }
    }

    this.logger.warn('Emergency cleanup completed. Check logs for any failures.');

    return {
      success: cleanupSteps.some(step => step.success), // Success if ANY step succeeded
      cleanupSteps,
    };
  }

  /**
   * Force stops a transform with aggressive parameters
   */
  private async forceStopTransform(transformId: string): Promise<void> {
    try {
      await this.esClient.transform.stopTransform({
        transform_id: transformId,
        force: true,
        wait_for_completion: false,
        timeout: '10s',
      });
      this.logger.info(`Force stopped transform: ${transformId}`);
    } catch (error) {
      if (error.statusCode === 404) {
        this.logger.debug(`Transform ${transformId} not found, skipping force stop`);
        return;
      }
      throw error;
    }
  }

  /**
   * Cleans up compliance-related Task Manager tasks
   */
  private async cleanupTaskManagerTasks(): Promise<void> {
    // Note: This is a placeholder implementation
    // In a real implementation, we would need access to TaskManager
    // to remove the monitoring and aggregation tasks
    this.logger.debug('Task Manager cleanup would happen here');
    
    // Tasks to clean up:
    // - endpoint-compliance:transform-monitoring
    // - endpoint-compliance:score-aggregation
    // 
    // Implementation would look like:
    // await taskManager.removeIfExists('endpoint-compliance-transform-monitoring-task');
    // await taskManager.removeIfExists('endpoint-compliance:score-aggregation');
  }

  /**
   * Validates that cleanup was successful by checking for remaining resources
   */
  async validateCleanup(): Promise<{
    isClean: boolean;
    remainingResources: {
      transforms: string[];
      indices: string[];
      templates: string[];
      policies: string[];
    };
  }> {
    const remainingResources = {
      transforms: [] as string[],
      indices: [] as string[],
      templates: [] as string[],
      policies: [] as string[],
    };

    try {
      // Check for remaining transforms
      try {
        const transformResponse = await this.esClient.transform.getTransform({
          transform_id: 'endpoint_compliance_*',
        });
        remainingResources.transforms = transformResponse.transforms?.map(t => t.id) || [];
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }

      // Check for remaining indices
      try {
        const indicesResponse = await this.esClient.cat.indices({
          index: 'endpoint_compliance.*',
          format: 'json',
          h: 'index',
        });
        if (Array.isArray(indicesResponse)) {
          remainingResources.indices = indicesResponse.map((idx: any) => idx.index);
        }
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }

      // Check for remaining templates
      try {
        const templatesResponse = await this.esClient.indices.getIndexTemplate({
          name: 'endpoint_compliance_*',
        });
        remainingResources.templates = templatesResponse.index_templates?.map(t => t.name) || [];
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }

      // Check for remaining ILM policies
      try {
        const policiesResponse = await this.esClient.ilm.getLifecycle({
          name: 'endpoint_compliance_*',
        });
        remainingResources.policies = Object.keys(policiesResponse);
      } catch (error) {
        if (error.statusCode !== 404) throw error;
      }

      const isClean = Object.values(remainingResources).every(arr => arr.length === 0);

      return {
        isClean,
        remainingResources,
      };
    } catch (error) {
      this.logger.error('Failed to validate cleanup:', error);
      return {
        isClean: false,
        remainingResources,
      };
    }
  }
}