/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

const WORKFLOW_FILES = [
  'daily_security_catchup.yaml',
  'incident_investigation.yaml',
  'weekly_team_catchup.yaml',
];

const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

/**
 * Wait for the WorkflowsService to be initialized by checking if it can retrieve workflows.
 * Retries with exponential backoff until the service is ready or max retries is reached.
 */
async function waitForWorkflowsService(
  workflowsManagement: WorkflowsServerPluginSetup,
  logger: Logger,
  spaceId: string
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Try to get workflows - if this succeeds, the service is initialized
      await workflowsManagement.management.getWorkflows(
        {
          page: 1,
          limit: 1,
          query: '',
        },
        spaceId
      );
      // Service is ready
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not initialized')) {
        // Service not ready yet, wait and retry
        const delay = Math.min(
          INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
          MAX_RETRY_DELAY_MS
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          logger.error(
            `WorkflowsService failed to initialize after ${MAX_RETRIES} attempts. Cannot register workflows.`
          );
          return false;
        }
      } else {
        // Different error - service might be ready but there's another issue
        // Return true to proceed (the actual registration will handle the error)
        return true;
      }
    }
  }
  return false;
}

export async function registerCatchupWorkflows(
  workflowsManagement: WorkflowsServerPluginSetup | undefined,
  logger: Logger,
  request: KibanaRequest,
  spaceId: string
): Promise<void> {
  if (!workflowsManagement) {
    logger.warn(
      'Workflows Management plugin not available. Workflows will not be registered automatically.'
    );
    return;
  }

  if (!workflowsManagement.management) {
    logger.warn(
      'Workflows Management API not available. Workflows will not be registered automatically.'
    );
    return;
  }

  // Wait for WorkflowsService to be initialized before proceeding
  const serviceReady = await waitForWorkflowsService(workflowsManagement, logger, spaceId);
  if (!serviceReady) {
    logger.error(
      'WorkflowsService failed to initialize. Skipping workflow registration to avoid creating duplicates.'
    );
    return;
  }

  const workflowsDir = join(__dirname, '.');

  for (const workflowFile of WORKFLOW_FILES) {
    try {
      const workflowPath = join(workflowsDir, workflowFile);
      const workflowYaml = readFileSync(workflowPath, 'utf-8');

      // Note: Dynamic date values (__DYNAMIC_24H_AGO__, __DYNAMIC_NOW__, __DYNAMIC_7D_AGO__)
      // are kept as placeholders and will be calculated at execution time.
      // For manual executions, the UI form calculates them dynamically.
      // For scheduled executions, they should be calculated at execution time by the workflow engine.

      // Extract workflow name from YAML to check if it already exists
      const nameMatch = workflowYaml.match(/^name:\s*['"](.+?)['"]/m);
      const workflowName = nameMatch ? nameMatch[1] : workflowFile.replace('.yaml', '');

      // Check if workflow already exists
      // Search all workflows and filter by exact name match to avoid duplicates
      // Note: getWorkflows returns { _pagination: {...}, results: [...] }
      let existingWorkflow;
      try {
        // Search without query to get all workflows, then filter by exact name
        // This is more reliable than using a search query which might miss the workflow
        const existingWorkflows = await workflowsManagement.management.getWorkflows(
          {
            page: 1,
            limit: 1000, // Get a large number to ensure we find existing workflows
            query: '', // Empty query to get all workflows
          },
          spaceId
        );

        // Find all workflows with exact name match (case-sensitive to avoid false matches)
        const matchingWorkflows =
          existingWorkflows.results?.filter((w) => w.name === workflowName) || [];

        if (matchingWorkflows.length > 1) {
          logger.warn(
            `Found ${matchingWorkflows.length} workflows with name "${workflowName}". ` +
              `This indicates duplicates. Will update the first one and delete the others.`
          );

          // Sort by createdAt descending to get the most recent one
          matchingWorkflows.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          });

          // Keep the most recent one (by creation date), delete the rest
          existingWorkflow = matchingWorkflows[0];
          const duplicatesToDelete = matchingWorkflows.slice(1);

          for (const duplicate of duplicatesToDelete) {
            try {
              await workflowsManagement.management.deleteWorkflows(
                [duplicate.id],
                spaceId,
                request
              );
            } catch (deleteError) {
              logger.error(
                `Failed to delete duplicate workflow "${workflowName}" with ID: ${duplicate.id}: ${
                  deleteError instanceof Error ? deleteError.message : String(deleteError)
                }`
              );
            }
          }
        } else if (matchingWorkflows.length === 1) {
          existingWorkflow = matchingWorkflows[0];
        } else {
          existingWorkflow = undefined;
        }
      } catch (error) {
        // If getWorkflows fails, log error but don't create - this prevents duplicates
        logger.error(
          `Failed to check for existing workflow "${workflowName}": ${
            error instanceof Error ? error.message : String(error)
          }. Skipping registration to avoid creating duplicates.`
        );
        if (error instanceof Error && error.stack) {
          logger.error(error.stack);
        }
        // Don't set existingWorkflow to undefined - skip this workflow entirely
        continue;
      }

      if (existingWorkflow) {
        // Update existing workflow with latest YAML
        // Catch authentication errors during scheduling - workflow will still be updated
        try {
          await workflowsManagement.management.updateWorkflow(
            existingWorkflow.id,
            {
              yaml: workflowYaml,
            },
            spaceId,
            request
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // If it's an authentication error during scheduling, log warning but continue
          // The workflow is still updated, just scheduling might fail until user runs it manually
          if (
            errorMessage.includes('Cannot authenticate') ||
            errorMessage.includes('authentication')
          ) {
            logger.warn(
              `Workflow "${workflowName}" updated successfully, but scheduling failed due to authentication. ` +
                `The workflow will work for manual execution. Scheduled triggers may not work until a user manually runs the workflow once.`
            );
          } else {
            // Re-throw other errors
            throw error;
          }
        }
        // Skip creation - workflow already exists and was updated
        continue;
      }

      // Only create if workflow doesn't exist
      try {
        await workflowsManagement.management.createWorkflow(
          {
            yaml: workflowYaml,
          },
          spaceId,
          request
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // If it's an authentication error during scheduling, log warning but continue
        // The workflow is still created, just scheduling might fail until user runs it manually
        if (
          errorMessage.includes('Cannot authenticate') ||
          errorMessage.includes('authentication')
        ) {
          logger.warn(
            `Workflow "${workflowName}" created successfully, but scheduling failed due to authentication. ` +
              `The workflow will work for manual execution. Scheduled triggers may not work until a user manually runs the workflow once.`
          );
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error registering workflow ${workflowFile}: ${errorMessage}`);
      // Continue with other workflows even if one fails
    }
  }
}
