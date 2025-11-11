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
          logger.debug(
            `WorkflowsService not ready yet (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`
          );
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
        logger.debug(
          `WorkflowsService check returned error (not initialization issue): ${errorMessage}. Proceeding.`
        );
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

  logger.info('Registering CatchUp Agent workflows...');

  // Wait for WorkflowsService to be initialized before proceeding
  logger.info('Waiting for WorkflowsService to be initialized...');
  const serviceReady = await waitForWorkflowsService(workflowsManagement, logger, spaceId);
  if (!serviceReady) {
    logger.error(
      'WorkflowsService failed to initialize. Skipping workflow registration to avoid creating duplicates.'
    );
    return;
  }
  logger.info('WorkflowsService is ready. Proceeding with workflow registration.');

  const workflowsDir = join(__dirname, '.');

  for (const workflowFile of WORKFLOW_FILES) {
    try {
      const workflowPath = join(workflowsDir, workflowFile);
      let workflowYaml = readFileSync(workflowPath, 'utf-8');

      // Inject dynamic date defaults for workflows
      if (workflowFile === 'daily_security_catchup.yaml') {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const nowISO = now.toISOString();
        const dayAgoISO = dayAgo.toISOString();

        // Replace marker values with calculated dates
        workflowYaml = workflowYaml.replace(/'__DYNAMIC_24H_AGO__'/g, `'${dayAgoISO}'`);
        workflowYaml = workflowYaml.replace(/'__DYNAMIC_NOW__'/g, `'${nowISO}'`);
      }

      if (workflowFile === 'incident_investigation.yaml') {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();

        // Replace marker value with calculated date
        workflowYaml = workflowYaml.replace(/'__DYNAMIC_7D_AGO__'/g, `'${sevenDaysAgoISO}'`);
      }

      // Extract workflow name from YAML to check if it already exists
      const nameMatch = workflowYaml.match(/^name:\s*['"](.+?)['"]/m);
      const workflowName = nameMatch ? nameMatch[1] : workflowFile.replace('.yaml', '');

      logger.info(`Checking if workflow "${workflowName}" already exists...`);

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

        logger.debug(
          `Found ${existingWorkflows.results?.length || 0} total workflows in space "${spaceId}"`
        );

        // Find all workflows with exact name match (case-sensitive to avoid false matches)
        const matchingWorkflows =
          existingWorkflows.results?.filter((w) => w.name === workflowName) || [];

        logger.debug(
          `Found ${matchingWorkflows.length} workflow(s) with exact name "${workflowName}"`
        );

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
              logger.info(`Deleted duplicate workflow "${workflowName}" with ID: ${duplicate.id}`);
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
          logger.info(
            `Found existing workflow "${workflowName}" with ID: ${existingWorkflow.id}. Will update it.`
          );
        } else {
          logger.info(
            `No existing workflow found with name "${workflowName}". Will create new one.`
          );
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
        logger.info(
          `Workflow "${workflowName}" already exists (ID: ${existingWorkflow.id}). Updating with latest YAML.`
        );

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

          logger.info(
            `Successfully updated workflow "${workflowName}" with ID: ${existingWorkflow.id}`
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
      logger.info(`Creating new workflow "${workflowName}"...`);
      try {
        const createdWorkflow = await workflowsManagement.management.createWorkflow(
          {
            yaml: workflowYaml,
          },
          spaceId,
          request
        );

        logger.info(
          `Successfully created new workflow "${workflowName}" with ID: ${createdWorkflow.id}`
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

  logger.info('CatchUp Agent workflow registration completed');
}
