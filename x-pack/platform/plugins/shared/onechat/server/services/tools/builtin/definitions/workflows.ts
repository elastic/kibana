/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import { z } from '@kbn/zod';

const listWorkflowsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Optional search query to filter workflows by name or description'),
  enabled: z
    .boolean()
    .optional()
    .describe(
      'Filter workflows by enabled status. Defaults to true to show only enabled workflows'
    ),
});

const executeWorkflowSchema = z.object({
  workflowId: z.string().describe('The ID or name of the workflow to execute'),
  inputs: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Input parameters for the workflow execution. Map the user-provided values to the workflow input parameter names. For example, if user says "execute with message: Hello World", map it to the workflow\'s expected input parameter name.'
    ),
});

const getWorkflowDetailsSchema = z.object({
  workflowId: z.string().describe('The ID or name of the workflow to get details for'),
});

const getWorkflowResultSchema = z.object({
  executionId: z.string().describe('The workflow execution ID to check results for'),
});

export const listWorkflowsTool = (
  workflowsManagement: WorkflowsPluginSetup
): BuiltinToolDefinition<typeof listWorkflowsSchema> => {
  return {
    id: 'list_workflows',
    description: `List available workflows that can be executed.

This tool helps you discover workflows that are available for execution. You can filter by name, description, or enabled status.

Use this tool when:
- A user asks "what workflows are available?"
- You need to find a specific workflow by name
- You want to show all enabled workflows
- You need to get workflow IDs for execution

Examples:
- "show me all workflows"
- "find workflows related to security"
- "list enabled workflows"
`,
    schema: listWorkflowsSchema,
    handler: async ({ query, enabled = true }, { request, logger }) => {
      logger.debug(`list_workflows tool called with query: ${query}, enabled: ${enabled}`);

      try {
        // Search for workflows using the management API
        const searchParams = {
          limit: 50, // Reasonable limit for chat display
          page: 1,
          enabled: enabled ? [true] : undefined,
          query,
        };

        // Get space ID from request
        const spaceId = 'default'; // TODO: Extract from request context when spaces are supported

        const workflowsResult = await workflowsManagement.management.getWorkflows(
          searchParams,
          spaceId
        );

        const workflows = workflowsResult.results.map((workflow: any) => ({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description || 'No description available',
          enabled: workflow.enabled,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
        }));

        const message =
          workflows.length > 0
            ? `Found ${workflows.length} workflow${workflows.length === 1 ? '' : 's'}`
            : 'No workflows found matching your criteria';

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                workflows,
                total: workflowsResult._pagination.total,
                message,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error listing workflows: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to list workflows: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['workflows'],
  };
};

export const executeWorkflowTool = (
  workflowsManagement: WorkflowsPluginSetup
): BuiltinToolDefinition<typeof executeWorkflowSchema> => {
  return {
    id: 'execute_workflow',
    description: `Execute a workflow with the provided inputs.

This tool runs a workflow asynchronously and returns an execution ID that can be used to check the results later.
The tool will wait a few seconds to see if the workflow completes quickly, and return immediate results if available.

IMPORTANT: When users provide input values in natural language, you must:
1. First use get_workflow_details to understand what input parameters the workflow expects
2. Extract the user-provided values from their message
3. Map those values to the correct input parameter names
4. Pass the mapped inputs to this tool

Use this tool when:
- A user wants to run a specific workflow
- You need to execute a workflow with certain parameters  
- A user uses slash commands like "/workflow workflow_name"
- A user provides input values like "execute with message: Hello World"

Examples:
- User: "Execute Send Slack Message with content: Hello World" 
  → First get workflow details to see it needs "message" parameter
  → Then call: execute_workflow(workflowId="send-slack-message", inputs={"message": "Hello World"})
- User: "Run data-processing workflow with file: report.csv and format: json"
  → Map to: execute_workflow(workflowId="data-processing", inputs={"file": "report.csv", "format": "json"})

The tool returns an execution ID that can be used with get_workflow_result to check status and results.
`,
    schema: executeWorkflowSchema,
    handler: async ({ workflowId, inputs = {} }, { request, logger }) => {
      logger.debug(`execute_workflow tool called with workflowId: ${workflowId}, inputs:`, inputs);

      try {
        // Get space ID from request
        const spaceId = 'default'; // TODO: Extract from request context when spaces are supported

        // First, try to get the workflow to validate it exists and is enabled
        let workflow;
        try {
          workflow = await workflowsManagement.management.getWorkflow(workflowId, spaceId);
        } catch (error) {
          // If getting by ID fails, try to search by name
          const searchResult = await workflowsManagement.management.getWorkflows(
            { limit: 1, page: 1, query: workflowId, enabled: [true] },
            spaceId
          );

          if (searchResult.results.length === 0) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Workflow "${workflowId}" not found or not enabled. Use list_workflows to see available workflows.`,
                  },
                },
              ],
            };
          }

          workflow = searchResult.results[0];
          workflowId = workflow.id; // Use the actual ID for execution
        }

        if (!workflow) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Workflow "${workflowId}" not found. Use list_workflows to see available workflows.`,
                },
              },
            ],
          };
        }

        if (!workflow.enabled) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Workflow "${workflow.name}" is disabled and cannot be executed.`,
                },
              },
            ],
          };
        }

        if (!workflow.valid) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Workflow "${workflow.name}" has validation errors and cannot be executed.`,
                },
              },
            ],
          };
        }

        // Get full workflow details if we only have a list item
        let fullWorkflow;
        if ('yaml' in workflow) {
          fullWorkflow = workflow;
        } else {
          const detailedWorkflow = await workflowsManagement.management.getWorkflow(
            workflow.id,
            spaceId
          );
          if (!detailedWorkflow) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Could not retrieve full workflow details for "${workflow.name}".`,
                  },
                },
              ],
            };
          }
          fullWorkflow = detailedWorkflow;
        }

        // Check if workflow has definition
        if (!fullWorkflow.definition) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Workflow "${fullWorkflow.name}" has no definition and cannot be executed.`,
                },
              },
            ],
          };
        }

        // Execute the workflow
        const executionId = await workflowsManagement.management.runWorkflow(
          {
            id: fullWorkflow.id,
            name: fullWorkflow.name,
            enabled: fullWorkflow.enabled,
            definition: fullWorkflow.definition,
            yaml: fullWorkflow.yaml,
          },
          spaceId,
          inputs,
          request
        );

        // Wait a few seconds to see if the workflow completes quickly
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if the workflow has completed
        try {
          const execution = await workflowsManagement.management.getWorkflowExecution(
            executionId,
            spaceId
          );

          if (execution && execution.status === 'completed') {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    executionId,
                    workflowName: workflow.name,
                    status: execution.status,
                    finishedAt: execution.finishedAt,
                    message: `Workflow "${workflow.name}" completed successfully!`,
                  },
                },
              ],
            };
          } else if (execution && execution.status === 'failed') {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Workflow "${workflow.name}" failed. Check the execution details for more information.`,
                    metadata: {
                      executionId,
                      workflowName: workflow.name,
                      status: execution.status,
                    },
                  },
                },
              ],
            };
          }
        } catch (checkError) {
          logger.debug(`Could not check execution status immediately: ${checkError}`);
        }

        // Workflow is still running or we couldn't check status
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                executionId,
                workflowName: workflow.name,
                status: 'running',
                message: `Workflow "${workflow.name}" started successfully. Use get_workflow_result with execution ID "${executionId}" to check the status and results.`,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error executing workflow: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to execute workflow: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['workflows'],
  };
};

export const getWorkflowDetailsTool = (
  workflowsManagement: WorkflowsPluginSetup
): BuiltinToolDefinition<typeof getWorkflowDetailsSchema> => {
  return {
    id: 'get_workflow_details',
    description: `Get detailed information about a specific workflow including its inputs, description, and configuration.

This tool provides comprehensive details about a workflow to help understand what it does and what inputs it requires before execution.

CRITICAL: Always use this tool BEFORE executing a workflow that might have inputs. This helps you understand:
1. What input parameters the workflow expects (names, types, descriptions)
2. Which inputs are required vs optional
3. Default values for optional inputs
4. How to map user-provided values to the correct parameter names

Use this tool when:
- A user asks about a specific workflow
- You need to understand what inputs a workflow requires BEFORE execution
- You want to show workflow configuration details
- A user wants to know what a workflow does
- Before executing any workflow to understand its input requirements

Returns workflow details including:
- Name, description, and enabled status
- Input parameters with names, types, descriptions, and requirements
- Workflow definition and steps
- Creation and update timestamps

Examples:
- Get details for workflow "data-processing" before execution
- Show me what inputs workflow ID "abc-123" needs
- What does the security-scan workflow do?
- User wants to execute a workflow → First get details to understand inputs
`,
    schema: getWorkflowDetailsSchema,
    handler: async ({ workflowId }, { request, logger }) => {
      logger.debug(`get_workflow_details tool called with workflowId: ${workflowId}`);

      try {
        // Get space ID from request
        const spaceId = 'default'; // TODO: Extract from request context when spaces are supported

        // First, try to get the workflow by ID
        let workflow;
        try {
          workflow = await workflowsManagement.management.getWorkflow(workflowId, spaceId);
        } catch (error) {
          // If getting by ID fails, try to search by name
          const searchResult = await workflowsManagement.management.getWorkflows(
            { limit: 1, page: 1, query: workflowId, enabled: undefined }, // Search both enabled and disabled
            spaceId
          );

          if (searchResult.results.length === 0) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Workflow "${workflowId}" not found. Use list_workflows to see available workflows.`,
                  },
                },
              ],
            };
          }

          // Get the full workflow details
          workflow = await workflowsManagement.management.getWorkflow(
            searchResult.results[0].id,
            spaceId
          );
        }

        if (!workflow) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Workflow "${workflowId}" not found. Use list_workflows to see available workflows.`,
                },
              },
            ],
          };
        }

        // Extract input parameters from workflow definition
        const inputs = [];
        if (workflow.definition && workflow.definition.inputs) {
          for (const [, inputConfig] of Object.entries(workflow.definition.inputs)) {
            const config = inputConfig as any;
            inputs.push({
              name: config?.name,
              type: config?.type || 'string',
              description: config?.description || 'No description available',
              required: config?.required !== false,
              default: config?.default,
              // Add examples or hints for better understanding
              example: config?.example || (config?.type === 'string' ? 'example text' : undefined),
            });
          }
        }

        // Extract steps information
        const steps = [];
        if (workflow.definition && workflow.definition.steps) {
          for (const [, stepConfig] of Object.entries(workflow.definition.steps)) {
            steps.push({
              name: stepConfig?.name,
              type: (stepConfig as any)?.type || 'unknown',
              description: (stepConfig as any)?.description || 'No description available',
              with: (stepConfig as any)?.with || 'No with available',
            });
          }
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description || 'No description available',
                enabled: workflow.enabled,
                valid: workflow.valid,
                inputs,
                steps,
                createdAt: workflow.createdAt,
                lastUpdatedAt: workflow.lastUpdatedAt,
                createdBy: workflow.createdBy,
                lastUpdatedBy: workflow.lastUpdatedBy,
                message: `Workflow "${workflow.name}" details retrieved successfully.`,
                inputsCount: inputs.length,
                hasRequiredInputs: inputs.some((input) => input.required),
                executionGuidance:
                  inputs.length > 0
                    ? `This workflow requires ${inputs.length} input parameter${
                        inputs.length === 1 ? '' : 's'
                      }. When executing, map user-provided values to these parameter names: ${inputs
                        .map((i) => i.name)
                        .join(', ')}`
                    : 'This workflow requires no input parameters and can be executed directly.',
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting workflow details: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get workflow details: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['workflows'],
  };
};

export const getWorkflowResultTool = (
  workflowsManagement: WorkflowsPluginSetup
): BuiltinToolDefinition<typeof getWorkflowResultSchema> => {
  return {
    id: 'get_workflow_result',
    description: `Get the status and results of a workflow execution, including step outputs.

This tool checks the current status of a workflow execution and returns the results if completed.
It includes detailed information about each step execution, including inputs, outputs, and execution times.

Use this tool when:
- You need to check if a workflow execution has completed
- A user wants to see the results of a previously started workflow
- You need to monitor the progress of a workflow execution
- You want to see the output data from workflow steps

Possible statuses:
- "running": The workflow is still executing (shows completed steps so far)
- "completed": The workflow finished successfully (includes all step results and outputs)
- "failed": The workflow encountered an error (shows which steps failed)
- "cancelled": The workflow was cancelled

Returns detailed information including:
- Execution status and timing
- Step-by-step results with inputs and outputs
- Error details for failed steps
- Progress information for running workflows

Examples:
- Check status of execution "abc-123-def"
- Get results and step outputs from a completed workflow
- Monitor a long-running workflow and see intermediate results
`,
    schema: getWorkflowResultSchema,
    handler: async ({ executionId }, { request, logger }) => {
      logger.debug(`get_workflow_result tool called with executionId: ${executionId}`);

      try {
        // Get space ID from request
        const spaceId = 'default'; // TODO: Extract from request context when spaces are supported

        // Get the workflow execution
        const execution = await workflowsManagement.management.getWorkflowExecution(
          executionId,
          spaceId
        );

        if (!execution) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Workflow execution "${executionId}" not found.`,
                },
              },
            ],
          };
        }

        const response: any = {
          executionId: execution.id,
          workflowId: execution.workflowId,
          workflowName: execution.workflowName,
          status: execution.status,
          startedAt: execution.startedAt,
        };

        // Extract step execution results
        const stepResults = [];
        if (execution.stepExecutions && execution.stepExecutions.length > 0) {
          for (const stepExecution of execution.stepExecutions) {
            stepResults.push({
              stepId: stepExecution.stepId,
              stepType: stepExecution.stepType,
              status: stepExecution.status,
              startedAt: stepExecution.startedAt,
              completedAt: stepExecution.completedAt,
              executionTimeMs: stepExecution.executionTimeMs,
              input: stepExecution.input,
              output: stepExecution.output,
            });
          }
        }

        switch (execution.status) {
          case 'completed':
            response.finishedAt = execution.finishedAt;
            response.stepResults = stepResults;
            response.message = `Workflow "${execution.workflowName}" completed successfully!`;
            if (stepResults.length > 0) {
              response.message += ` Executed ${stepResults.length} step${
                stepResults.length === 1 ? '' : 's'
              }.`;
            }
            break;

          case 'failed':
            response.finishedAt = execution.finishedAt;
            response.stepResults = stepResults;
            response.message = `Workflow "${execution.workflowName}" failed`;
            // Find failed steps
            const failedSteps = stepResults.filter((step) => step.status === 'failed');
            if (failedSteps.length > 0) {
              response.message += `. Failed step${
                failedSteps.length === 1 ? '' : 's'
              }: ${failedSteps.map((s) => s.stepId).join(', ')}`;
            }
            break;

          case 'cancelled':
            response.finishedAt = execution.finishedAt;
            response.stepResults = stepResults;
            response.message = `Workflow "${execution.workflowName}" was cancelled.`;
            break;

          case 'running':
          default:
            // For running workflows, include completed steps so far
            const completedSteps = stepResults.filter((step) => step.status === 'completed');
            if (completedSteps.length > 0) {
              response.stepResults = stepResults;
              response.message = `Workflow "${
                execution.workflowName
              }" is still running. Completed ${completedSteps.length} of ${
                stepResults.length
              } step${stepResults.length === 1 ? '' : 's'} so far.`;
            } else {
              response.message = `Workflow "${execution.workflowName}" is still running. Started at ${execution.startedAt}.`;
            }
            break;
        }

        // Add execution duration if available
        if (execution.duration) {
          response.duration = execution.duration;
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: response,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting workflow result: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get workflow result: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['workflows'],
  };
};
