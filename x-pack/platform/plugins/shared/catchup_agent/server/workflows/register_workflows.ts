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
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-plugin/server';

const WORKFLOW_FILES = [
  'daily_security_catchup.yaml',
  'incident_investigation.yaml',
  'weekly_team_catchup.yaml',
];

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

  const workflowsDir = join(__dirname, '.');

  for (const workflowFile of WORKFLOW_FILES) {
    try {
      const workflowPath = join(workflowsDir, workflowFile);
      let workflowYaml = readFileSync(workflowPath, 'utf-8');

      // Inject dynamic date defaults for daily_security_catchup workflow
      if (workflowFile === 'daily_security_catchup.yaml') {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const nowISO = now.toISOString();
        const dayAgoISO = dayAgo.toISOString();

        // Replace marker values with calculated dates
        workflowYaml = workflowYaml.replace(/'__DYNAMIC_24H_AGO__'/g, `'${dayAgoISO}'`);
        workflowYaml = workflowYaml.replace(/'__DYNAMIC_NOW__'/g, `'${nowISO}'`);
      }

      // Extract workflow name from YAML to check if it already exists
      const nameMatch = workflowYaml.match(/^name:\s*['"](.+?)['"]/m);
      const workflowName = nameMatch ? nameMatch[1] : workflowFile.replace('.yaml', '');

      // Check if workflow already exists
      // Note: getWorkflows returns { _pagination: {...}, results: [...] }
      let existingWorkflow;
      try {
        const existingWorkflows = await workflowsManagement.management.getWorkflows(
          {
            page: 1,
            limit: 100,
            query: workflowName,
          },
          spaceId
        );

        existingWorkflow = existingWorkflows.results?.find((w) => w.name === workflowName);
      } catch (error) {
        // If getWorkflows fails, log and continue (might be a transient issue)
        logger.warn(
          `Could not check for existing workflow "${workflowName}": ${
            error instanceof Error ? error.message : String(error)
          }. Will attempt to create.`
        );
        existingWorkflow = undefined;
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
        continue;
      }

      // Create workflow
      // Catch authentication errors during scheduling - workflow will still be created
      try {
        const createdWorkflow = await workflowsManagement.management.createWorkflow(
          {
            yaml: workflowYaml,
          },
          spaceId,
          request
        );

        logger.info(
          `Successfully registered workflow "${workflowName}" with ID: ${createdWorkflow.id}`
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
