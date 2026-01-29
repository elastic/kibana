/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { Skill } from '@kbn/agent-builder-common/skills';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { extractTextContent } from '@kbn/agent-builder-genai-utils/langchain';
import { WorkflowSchema } from '@kbn/workflows/spec/schema';

// Constants
const MAX_RETRY_ATTEMPTS = 3;
const INLINE_YAML_REGEX = /```(?:yaml|yml)?\s*([\s\S]*?)\s*```/gm;

// Helper to get OneChat context from tool config
const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const maybeConfig = config as {
    configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
  };

  return maybeConfig.configurable?.onechat ?? null;
};

// Types for workflow generation actions
interface GenerateAction {
  type: 'generate';
  success: boolean;
  yaml?: string;
  error?: string;
  attempt: number;
}

interface ValidateAction {
  type: 'validate';
  success: boolean;
  error?: string;
  attempt: number;
}

type Action = GenerateAction | ValidateAction;

const isGenerateAction = (action: Action): action is GenerateAction => action.type === 'generate';

const isValidateAction = (action: Action): action is ValidateAction => action.type === 'validate';

// State annotation for the generation graph
const WorkflowGenerationStateAnnotation = Annotation.Root({
  // Inputs
  description: Annotation<string>(),
  existingWorkflow: Annotation<string | undefined>(),
  workflowName: Annotation<string | undefined>(),
  // Internal
  currentAttempt: Annotation<number>({ reducer: (_, newValue) => newValue, default: () => 0 }),
  actions: Annotation<Action[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // Outputs
  generatedYaml: Annotation<string | null>(),
  error: Annotation<string | null>(),
});

type WorkflowGenerationState = typeof WorkflowGenerationStateAnnotation.State;

// Prompts for workflow generation
const SYSTEM_PROMPT = `You are an expert at creating Kibana workflow definitions in YAML format.

Workflow Structure:
- version: "1" (always use version 1)
- name: A descriptive name for the workflow
- description: What the workflow does
- enabled: true/false
- triggers: Array of trigger definitions (manual, scheduled, alert)
- inputs: Optional array of input definitions with name, type, required, default, description
- outputs: Optional array of output definitions with name, type, required, description
- consts: Optional constants that can be referenced in steps
- settings: Optional workflow settings (timeout, concurrency, on-failure)
- steps: Array of step definitions

## Input/Output Schema Definition

### Declaring Inputs
Inputs define what data a workflow accepts from its caller (parent workflow or external trigger).

\`\`\`yaml
inputs:
  - name: timeRange
    type: string
    required: true
    description: "Time range for data retrieval"
  - name: severity
    type: choice
    options: ["low", "medium", "high", "critical"]
    required: false
    default: "medium"
  - name: maxResults
    type: number
    required: false
    default: 100
\`\`\`

### Declaring Outputs
Outputs define what data a workflow returns to its caller.

\`\`\`yaml
outputs:
  - name: alerts
    type: array
    required: true
    description: "Retrieved alerts"
  - name: count
    type: number
    required: true
    description: "Number of alerts found"
  - name: summary
    type: string
    required: false
    description: "Human-readable summary"
\`\`\`

### Supported Types
| Type | Description | Example |
|------|-------------|---------|
| string | Text value | "hello" |
| number | Numeric value | 42 |
| boolean | True/false | true |
| choice | Enum value | "active" (from options) |
| array | List of values | [1, 2, 3] or ["a", "b"] |

### Type Constraints
Arrays support constraints:
\`\`\`yaml
outputs:
  - name: items
    type: array
    minItems: 1
    maxItems: 100
\`\`\`

## Available Trigger Types
1. manual: { type: "manual" } - Triggered by user action
2. scheduled: { type: "scheduled", with: { every: "5m" } } or { type: "scheduled", with: { rrule: { freq: "DAILY", interval: 1 } } }
3. alert: { type: "alert", with: { rule_id: "..." } } or { type: "alert", with: { rule_name: "..." } }

## Available Step Types

### 1. http: Make HTTP requests
- type: "http"
- with: { url, method, headers, body, timeout }

### 2. elasticsearch.*: Elasticsearch operations
- type: "elasticsearch.search", "elasticsearch.index", etc.
- with: { request: { method, path, body } } or sugar syntax with { index, query, body }

### 3. kibana.*: Kibana API operations
- type: "kibana.cases.create", etc.
- with: { request: { method, path, body } } or sugar syntax

### 4. wait: Pause execution
- type: "wait"
- with: { duration: "5s" }

### 5. data.set: Set variables
- type: "data.set"
- with: { key: value }

### 6. foreach: Iterate over array
- type: "foreach"
- foreach: "{{ steps.previous.output.items }}"
- steps: [...]

### 7. if: Conditional execution
- type: "if"
- condition: "{{ inputs.value > 10 }}"
- steps: [...]
- else: [...]

### 8. parallel: Run branches in parallel
- type: "parallel"
- branches: [{ name: "branch1", steps: [...] }, { name: "branch2", steps: [...] }]

### 9. Connector steps: Use any registered Kibana connector
- type: "<connector-type>" (e.g., ".slack", ".email", ".jira")
- connector-id: "connector-id" (optional, can be looked up by type)
- with: { ... connector-specific parameters }

## Workflow Composition Step Types

### 10. workflow.execute: Synchronous Child Workflow Execution
Executes a child workflow and WAITS for completion before continuing.
- Parent workflow PAUSES until child completes
- Child workflow output becomes available in parent context
- Errors in child workflow propagate to parent

\`\`\`yaml
steps:
  - name: retrieve_alerts
    type: workflow.execute
    with:
      workflow-id: "alert-retrieval-workflow"
      inputs:
        timeRange: "last-1h"
        severity: "critical"
\`\`\`

Output available as: steps.retrieve_alerts.output.<field>

### 11. workflow.executeAsync: Asynchronous Child Workflow Execution
Executes a child workflow WITHOUT waiting for completion.
- Parent workflow CONTINUES immediately
- Returns execution metadata (ID, status, timestamps)
- NO access to child workflow output

\`\`\`yaml
steps:
  - name: trigger_background_job
    type: workflow.executeAsync
    with:
      workflow-id: "background-processor"
      inputs:
        data: "{{ steps.previous.output }}"
\`\`\`

Output structure (execution metadata only):
\`\`\`yaml
{
  "workflowId": "background-processor",
  "executionId": "exec-123",
  "awaited": false,
  "status": "pending",
  "startedAt": "2024-01-01T00:00:00Z"
}
\`\`\`

### 12. workflow.output: Emit Outputs and Terminate
Emits outputs from a workflow and TERMINATES execution.
- Validates outputs against declared schema
- No subsequent steps run after this
- Makes outputs available to parent workflow

\`\`\`yaml
outputs:
  - name: alerts
    type: array
    required: true
  - name: count
    type: number
    required: true

steps:
  - name: process_data
    type: elasticsearch.search
    with:
      index: "alerts-*"
  
  - name: emit_results
    type: workflow.output
    with:
      alerts: "{{ steps.process_data.output.hits }}"
      count: "{{ steps.process_data.output.total }}"
\`\`\`

Status options: completed (default), cancelled, failed

### 13. workflow.fail: Fail with Error
Fails a workflow with an error message.
- Sets workflow status to "failed"
- Error message propagates to parent workflow
- Terminates execution immediately

\`\`\`yaml
steps:
  - name: validate_input
    type: workflow.fail
    if: "{{ inputs.amount < 0 }}"
    with:
      message: "Amount cannot be negative: {{ inputs.amount }}"
\`\`\`

## Context and Variables

### Parent Context in Child Workflow
Child workflows have access to parent information:
\`\`\`yaml
parent:
  workflowId: "parent-workflow-id"
  executionId: "parent-execution-id"
\`\`\`

### Expression Syntax
- Use {{ }} for expressions: {{ inputs.name }}, {{ steps.step_name.output.field }}
- Available context: inputs, consts, steps, workflow, execution, event (for alert triggers), parent (in child workflows)

## Example Workflows

### Simple Alert Notification
\`\`\`yaml
version: "1"
name: Simple Alert Notification
description: Sends a notification when an alert is triggered
enabled: true
triggers:
  - type: alert
    with:
      rule_name: "High CPU Usage"
inputs:
  - name: notification_channel
    type: string
    default: "#alerts"
steps:
  - name: send-notification
    type: .slack
    connector-id: "my-slack-connector"
    with:
      message: "Alert triggered: {{ event.rule.name }}"
      channel: "{{ inputs.notification_channel }}"
\`\`\`

### Reusable Alert Retrieval Workflow
\`\`\`yaml
version: "1"
name: alert-retrieval-workflow
description: Retrieves alerts from Elasticsearch

inputs:
  - name: timeRange
    type: string
    required: true
  - name: severity
    type: string
    required: false
    default: "medium"

outputs:
  - name: alerts
    type: array
    required: true
  - name: count
    type: number
    required: true

triggers:
  - type: manual

steps:
  - name: search_alerts
    type: elasticsearch.search
    with:
      index: "alerts-*"
      query:
        bool:
          must:
            - range:
                "@timestamp":
                  gte: "{{ inputs.timeRange }}"
            - match:
                severity: "{{ inputs.severity }}"
  
  - name: emit_results
    type: workflow.output
    with:
      alerts: "{{ steps.search_alerts.output.hits }}"
      count: "{{ steps.search_alerts.output.total }}"
\`\`\`

### Orchestration Workflow (Composition Example)
\`\`\`yaml
version: "1"
name: alert-processing-pipeline
description: Retrieves alerts, processes them, and sends notifications

triggers:
  - type: scheduled
    with:
      every: "15m"

steps:
  # Step 1: Execute retrieval workflow (sync - waits for output)
  - name: retrieve_critical_alerts
    type: workflow.execute
    with:
      workflow-id: "alert-retrieval-workflow"
      inputs:
        timeRange: "now-1h"
        severity: "critical"
  
  # Step 2: Validate we got results
  - name: fail_if_error
    type: workflow.fail
    if: "{{ steps.retrieve_critical_alerts.error }}"
    with:
      message: "Alert retrieval failed: {{ steps.retrieve_critical_alerts.error.message }}"
  
  # Step 3: Process alerts
  - name: analyze_alerts
    type: http
    with:
      url: "https://api.example.com/analyze"
      method: POST
      body:
        alerts: "{{ steps.retrieve_critical_alerts.output.alerts }}"
  
  # Step 4: Conditional notification
  - name: notify_team
    type: workflow.execute
    if: "{{ steps.retrieve_critical_alerts.output.count > 0 }}"
    with:
      workflow-id: "slack-notification-workflow"
      inputs:
        message: "Found {{ steps.retrieve_critical_alerts.output.count }} critical alerts"
        channel: "security-alerts"
  
  # Step 5: Trigger background job (async - fire and forget)
  - name: archive_alerts
    type: workflow.executeAsync
    with:
      workflow-id: "alert-archiver"
      inputs:
        alertIds: "{{ steps.retrieve_critical_alerts.output.alerts | map('id') }}"
\`\`\`

### Parallel Retrieval Pattern
\`\`\`yaml
version: "1"
name: multi-source-collector
description: Collects data from multiple sources in parallel

triggers:
  - type: manual

steps:
  - name: parallel_retrieval
    type: parallel
    branches:
      - name: alerts_branch
        steps:
          - name: get_alerts
            type: workflow.execute
            with:
              workflow-id: "alert-retrieval"
      
      - name: logs_branch
        steps:
          - name: get_logs
            type: workflow.execute
            with:
              workflow-id: "log-retrieval"
      
      - name: metrics_branch
        steps:
          - name: get_metrics
            type: workflow.execute
            with:
              workflow-id: "metric-retrieval"
  
  - name: process_all
    type: http
    with:
      url: "https://api.example.com/analyze"
      body:
        alerts: "{{ steps.parallel_retrieval.alerts_branch.get_alerts.output }}"
        logs: "{{ steps.parallel_retrieval.logs_branch.get_logs.output }}"
        metrics: "{{ steps.parallel_retrieval.metrics_branch.get_metrics.output }}"
\`\`\`

## Best Practices for Workflow Composition

### 1. Design Reusable Workflows
- Single responsibility: each workflow does one thing well
- Clear input/output contracts with descriptions
- Can be reused by multiple parent workflows

### 2. Choose Sync vs Async Appropriately
Use workflow.execute (sync) when:
- You need the child workflow output
- Parent depends on child completion
- Error handling is required

Use workflow.executeAsync (async) when:
- Fire-and-forget operations
- Background jobs
- You don't need child output
- Want parallel execution

### 3. Validate Inputs Early
\`\`\`yaml
steps:
  - name: validate_inputs
    type: workflow.fail
    if: "{{ inputs.count < 1 || inputs.count > 1000 }}"
    with:
      message: "Count must be between 1 and 1000"
\`\`\`

### 4. Handle Errors Gracefully
\`\`\`yaml
steps:
  - name: execute_child
    type: workflow.execute
    with:
      workflow-id: "child"
    on_failure:
      - name: log_error
        type: console
        with:
          message: "Child failed: {{ steps.execute_child.error.message }}"
\`\`\`

## IMPORTANT RULES
1. Always output valid YAML wrapped in \`\`\`yaml code blocks
2. Every workflow must have at least one trigger and one step
3. Step names must be unique within the workflow
4. Use meaningful step names in kebab-case
5. Reference previous step outputs using {{ steps.<step-name>.output }}
6. Validate all expressions use correct context paths
7. Workflows with outputs MUST use workflow.output to emit them
8. Use workflow.execute when you need child output, workflow.executeAsync for fire-and-forget
9. Always declare inputs/outputs for reusable child workflows
10. Child workflows can access parent context via {{ parent.workflowId }} and {{ parent.executionId }}`;

const createGenerationPrompt = (params: {
  description: string;
  existingWorkflow?: string;
  workflowName?: string;
  previousAttempts?: string;
}) => {
  const { description, existingWorkflow, workflowName, previousAttempts } = params;

  let prompt = SYSTEM_PROMPT + '\n\n';

  if (existingWorkflow) {
    prompt += `## Existing Workflow to Modify\n\`\`\`yaml\n${existingWorkflow}\n\`\`\`\n\n`;
    prompt += `## Modification Request\n${description}\n\n`;
  } else {
    prompt += `## Workflow Request\n${description}\n\n`;
    if (workflowName) {
      prompt += `Workflow name should be: ${workflowName}\n\n`;
    }
  }

  if (previousAttempts) {
    prompt += `## Previous Attempts (fix the errors)\n${previousAttempts}\n\n`;
  }

  prompt += `Generate a complete, valid workflow YAML that fulfills the request. Output only the YAML wrapped in \`\`\`yaml code blocks.`;

  return prompt;
};

// Create the workflow generation graph
const createWorkflowGenerationGraph = (model: ScopedModel, logger: Logger) => {
  // Node: Generate workflow YAML
  const generateNode = async (state: WorkflowGenerationState) => {
    const attempt = state.currentAttempt + 1;
    logger.debug(`Generating workflow (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

    // Build context from previous actions for retry attempts
    const previousAttempts = state.actions
      .filter((action) => isGenerateAction(action) || isValidateAction(action))
      .map((action) => {
        if (isGenerateAction(action)) {
          return `Attempt ${action.attempt}: ${action.success ? 'Generated YAML' : `Generation failed - ${action.error}`
            }`;
        }
        if (isValidateAction(action)) {
          return `Validation ${action.attempt}: ${action.success ? 'PASSED' : `FAILED - ${action.error}`
            }`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    const prompt = createGenerationPrompt({
      description: state.description,
      existingWorkflow: state.existingWorkflow,
      workflowName: state.workflowName,
      previousAttempts: previousAttempts || undefined,
    });

    let action: GenerateAction;
    try {
      const response = await model.chatModel.invoke(prompt);
      const responseText = extractTextContent(response);

      // Extract YAML from markdown code blocks
      const yamlMatches = Array.from(responseText.matchAll(INLINE_YAML_REGEX));

      if (yamlMatches.length > 0) {
        const yamlText = yamlMatches[0][1].trim();
        logger.debug('Generated workflow YAML successfully');
        action = {
          type: 'generate',
          success: true,
          yaml: yamlText,
          attempt,
        };
      } else {
        // Try to use the response directly if no code block
        action = {
          type: 'generate',
          success: true,
          yaml: responseText.trim(),
          attempt,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Workflow generation failed (attempt ${attempt}): ${errorMessage}`);
      action = {
        type: 'generate',
        success: false,
        error: errorMessage,
        attempt,
      };
    }

    return {
      currentAttempt: attempt,
      actions: [action],
    };
  };

  // Node: Validate workflow YAML
  const validateNode = async (state: WorkflowGenerationState) => {
    const attempt = state.currentAttempt;
    logger.debug(`Validating workflow (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

    const lastGenerateAction = [...state.actions].reverse().find(isGenerateAction);

    if (!lastGenerateAction || !lastGenerateAction.yaml) {
      const action: ValidateAction = {
        type: 'validate',
        success: false,
        error: 'No workflow YAML found to validate',
        attempt,
      };
      return { actions: [action] };
    }

    let action: ValidateAction;
    try {
      const yaml = lastGenerateAction.yaml;

      // Parse YAML to JSON (simple YAML parser for workflow format)
      // Note: In a real implementation, you'd use a proper YAML parser
      const { parse } = await import('yaml');
      const workflowJson = parse(yaml);

      // Validate against the workflow schema
      const validationResult = WorkflowSchema.safeParse(workflowJson);

      if (validationResult.success) {
        logger.debug('Workflow validation passed');
        action = {
          type: 'validate',
          success: true,
          attempt,
        };
      } else {
        const errors = validationResult.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        logger.warn(`Workflow validation failed: ${errors}`);
        action = {
          type: 'validate',
          success: false,
          error: errors,
          attempt,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Workflow validation error: ${errorMessage}`);
      action = {
        type: 'validate',
        success: false,
        error: errorMessage,
        attempt,
      };
    }

    return { actions: [action] };
  };

  // Node: Finalize - extract outputs from actions
  const finalizeNode = async (state: WorkflowGenerationState) => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateAction);
    const lastGenerateAction = [...state.actions].reverse().find(isGenerateAction);

    if (lastValidateAction?.success && lastGenerateAction?.yaml) {
      return {
        generatedYaml: lastGenerateAction.yaml,
        error: null,
      };
    }

    return {
      generatedYaml: null,
      error:
        lastValidateAction?.error || lastGenerateAction?.error || 'Unknown error during generation',
    };
  };

  // Router: Check if we should retry or end after validation
  const shouldRetryRouter = (state: WorkflowGenerationState): string => {
    const lastValidateAction = [...state.actions].reverse().find(isValidateAction);

    if (lastValidateAction?.success) {
      logger.debug('Workflow validated successfully, finalizing');
      return 'finalize';
    }

    if (state.currentAttempt >= MAX_RETRY_ATTEMPTS) {
      logger.warn(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached, finalizing`);
      return 'finalize';
    }

    logger.debug(`Retry ${state.currentAttempt}/${MAX_RETRY_ATTEMPTS}, generating again`);
    return 'generate';
  };

  // Build and compile the graph
  const graph = new StateGraph(WorkflowGenerationStateAnnotation)
    .addNode('generate', generateNode)
    .addNode('validate', validateNode)
    .addNode('finalize', finalizeNode)
    .addEdge('__start__', 'generate')
    .addEdge('generate', 'validate')
    .addConditionalEdges('validate', shouldRetryRouter, {
      generate: 'generate',
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};

// Validate workflow YAML helper
const validateWorkflowYaml = async (
  yamlString: string
): Promise<{ valid: boolean; errors?: string[] }> => {
  try {
    const { parse } = await import('yaml');
    const workflowJson = parse(yamlString);
    const validationResult = WorkflowSchema.safeParse(workflowJson);

    if (validationResult.success) {
      return { valid: true };
    }

    const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, errors: [errorMessage] };
  }
};

// Tool schema definitions
const generateOperationSchema = z.object({
  operation: z
    .literal('generate')
    .describe('Generate a new workflow from natural language description'),
  description: z.string().describe('Natural language description of the desired workflow behavior'),
  workflowName: z.string().optional().describe('Optional name for the workflow'),
});

const updateOperationSchema = z.object({
  operation: z
    .literal('update')
    .describe('Update an existing workflow based on natural language modifications'),
  workflowId: z.string().describe('ID of the workflow to update'),
  description: z.string().describe('Natural language description of the modifications to make'),
  confirm: z.boolean().describe('Must be true to confirm the update operation'),
  confirmReason: z.string().optional().describe('Reason for confirming the update'),
});

const validateOperationSchema = z.object({
  operation: z
    .literal('validate')
    .describe('Validate a workflow YAML definition against the schema'),
  yaml: z.string().describe('The workflow YAML definition to validate'),
});

// Main skill tool
const PLATFORM_WORKFLOW_GENERATION_TOOL = tool(
  async (input, config) => {
    const onechat = getOneChatContext(config);
    if (!onechat) {
      throw new Error('OneChat context not available');
    }

    const asAny = input as any;
    const { operation } = asAny ?? {};

    switch (operation) {
      case 'generate': {
        const { description, workflowName } = asAny;

        if (!description) {
          return JSON.stringify({
            error: { message: 'Description is required for workflow generation' },
          });
        }

        try {
          const model = await onechat.modelProvider.getDefaultModel();
          const graph = createWorkflowGenerationGraph(model, onechat.logger);

          const result = await graph.invoke({
            description,
            workflowName,
          });

          if (result.generatedYaml) {
            // Create workflow_draft attachment for visual preview
            // Use the attachments API directly instead of the attachment tool
            try {
              if (onechat.attachments) {
                await onechat.attachments.add({
                  type: 'workflow_draft',
                  data: {
                    yaml: result.generatedYaml,
                  },
                });
              }
            } catch (attachmentError) {
              // Log but don't fail - attachment is nice-to-have
              onechat.logger.warn(
                `Failed to create workflow_draft attachment: ${attachmentError}`
              );
            }

            return JSON.stringify({
              success: true,
              workflow: result.generatedYaml,
              message:
                'Workflow generated successfully. A visual preview has been attached. Review the workflow and confirm to create it using the workflows tool.',
            });
          } else {
            return JSON.stringify({
              success: false,
              error: result.error || 'Failed to generate workflow',
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return JSON.stringify({
            success: false,
            error: errorMessage,
          });
        }
      }

      case 'update': {
        const { workflowId, description, confirm, confirmReason } = asAny;

        if (!confirm) {
          return JSON.stringify({
            error: {
              message: 'Update operation requires confirm: true',
              hint: 'Set confirm: true to proceed with the update',
            },
          });
        }

        if (!workflowId) {
          return JSON.stringify({
            error: { message: 'workflowId is required for update operation' },
          });
        }

        if (!description) {
          return JSON.stringify({
            error: { message: 'description is required for update operation' },
          });
        }

        try {
          // First, get the existing workflow
          const getWorkflowToolId = platformCoreTools.getWorkflow;
          const available = await onechat.toolProvider.has({
            toolId: getWorkflowToolId,
            request: onechat.request,
          });

          if (!available) {
            return JSON.stringify({
              error: { message: 'getWorkflow tool not available' },
            });
          }

          const existingWorkflowResult = await onechat.runner.runTool({
            toolId: getWorkflowToolId,
            toolParams: { workflowId },
          });

          const existingWorkflow =
            typeof existingWorkflowResult === 'string'
              ? JSON.parse(existingWorkflowResult)
              : existingWorkflowResult;

          if (existingWorkflow.error || !existingWorkflow.yaml) {
            return JSON.stringify({
              error: { message: `Workflow not found: ${workflowId}` },
            });
          }

          // Generate updated workflow
          const model = await onechat.modelProvider.getDefaultModel();
          const graph = createWorkflowGenerationGraph(model, onechat.logger);

          const result = await graph.invoke({
            description,
            existingWorkflow: existingWorkflow.yaml,
          });

          if (result.generatedYaml) {
            return JSON.stringify({
              success: true,
              workflowId,
              updatedWorkflow: result.generatedYaml,
              confirmReason,
              message: 'Workflow updated successfully. The updated YAML is ready to be saved.',
              hint: 'Use the workflows management API to persist the changes.',
            });
          } else {
            return JSON.stringify({
              success: false,
              error: result.error || 'Failed to update workflow',
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return JSON.stringify({
            success: false,
            error: errorMessage,
          });
        }
      }

      case 'validate': {
        const { yaml } = asAny;

        if (!yaml) {
          return JSON.stringify({
            error: { message: 'yaml is required for validate operation' },
          });
        }

        const validationResult = await validateWorkflowYaml(yaml);

        if (validationResult.valid) {
          return JSON.stringify({
            success: true,
            valid: true,
            message: 'Workflow YAML is valid against the schema',
          });
        } else {
          return JSON.stringify({
            success: true,
            valid: false,
            errors: validationResult.errors,
            message: 'Workflow YAML has validation errors',
          });
        }
      }

      default:
        return JSON.stringify({
          error: {
            message: `Unknown operation: ${operation}`,
            hint: 'Valid operations are: generate, update, validate',
          },
        });
    }
  },
  {
    name: 'platform.workflow_generation',
    description:
      'Generate and modify Kibana workflows using natural language. Supports workflow creation, modification, and validation.',
    schema: z.discriminatedUnion('operation', [
      generateOperationSchema,
      updateOperationSchema,
      validateOperationSchema,
    ]),
  }
);

export const PLATFORM_WORKFLOW_GENERATION_SKILL: Skill = {
  namespace: 'platform.workflow_generation',
  name: 'Workflow Generation',
  description: 'Generate and modify Kibana workflows using natural language',
  content: `# Workflow Generation Skill

## What this skill does
Helps you create and modify Kibana workflow definitions using natural language descriptions instead of manually writing YAML. Supports workflow composition patterns for building complex automation pipelines.

## Tools and operations
Use \`platform.workflow_generation\` with one of these operations:

### generate
Create a new workflow from a natural language description.
\`\`\`json
{
  "operation": "generate",
  "description": "Create a workflow that monitors high CPU alerts and sends Slack notifications",
  "workflowName": "cpu-alert-notifier"
}
\`\`\`

### update
Modify an existing workflow based on natural language instructions.
\`\`\`json
{
  "operation": "update",
  "workflowId": "workflow-123",
  "description": "Add a step to also create a Jira ticket when alerts fire",
  "confirm": true,
  "confirmReason": "User requested to add Jira integration"
}
\`\`\`

### validate
Validate a workflow YAML definition against the schema.
\`\`\`json
{
  "operation": "validate",
  "yaml": "version: \\"1\\"\\nname: My Workflow\\n..."
}
\`\`\`

## Workflow capabilities
Generated workflows can include:
- **Triggers**: manual, scheduled (cron/interval), alert-based
- **Steps**: HTTP requests, Elasticsearch queries, Kibana API calls, connector actions
- **Control flow**: conditionals (if/else), loops (foreach), parallel execution
- **Error handling**: retries, fallbacks, on-failure handlers, workflow.fail

## Workflow Composition
The skill supports workflow composition for building modular, reusable pipelines:

### Input/Output Schemas
Workflows can declare typed inputs and outputs:
- **Inputs**: Data passed from parent to child workflow (string, number, boolean, choice, array)
- **Outputs**: Data returned from child to parent workflow

### Composition Step Types
- **workflow.execute**: Synchronous execution - waits for child completion, output available
- **workflow.executeAsync**: Async execution - fire-and-forget, no output access
- **workflow.output**: Emit outputs and terminate workflow
- **workflow.fail**: Fail with error message, propagates to parent

### Common Patterns
1. **Retrieval Workflow**: Fetches data, emits via workflow.output
2. **Promotion Workflow**: Receives data, performs action (notification, ticket creation)
3. **Orchestration Workflow**: Composes retrieval → processing → promotion

### Example: Create Reusable Alert Retrieval
\`\`\`
platform.workflow_generation({
  operation: "generate",
  description: "Create a reusable workflow that retrieves alerts from Elasticsearch. Accept timeRange and severity as inputs. Emit alerts array and count as outputs.",
  workflowName: "alert-retrieval"
})
\`\`\`

### Example: Create Orchestration Pipeline
\`\`\`
platform.workflow_generation({
  operation: "generate",
  description: "Create an orchestration workflow that: 1) Executes alert-retrieval workflow for critical alerts, 2) If alerts found, execute slack-notification workflow, 3) Fire-and-forget execute alert-archiver workflow",
  workflowName: "alert-processing-pipeline"
})
\`\`\`

## Safe workflow
1. Ask the user to describe what they want the workflow to do
2. Use \`operation: "generate"\` to create the workflow YAML
3. Review the generated YAML with the user
4. Use \`operation: "validate"\` to ensure it's schema-valid
5. Use the platform workflows tools to actually create/save the workflow

## When to use composition
- **Single workflows**: Simple automation, direct actions
- **Composition**: Complex pipelines, reusable components, parallel data gathering

### Sync vs Async Decision
Use **workflow.execute** (sync) when:
- You need the child workflow output in subsequent steps
- Parent depends on child completion
- Error handling is required

Use **workflow.executeAsync** (async) when:
- Fire-and-forget operations (archiving, logging)
- Background jobs
- Don't need child output

## Important notes
- Generated workflows are returned as YAML strings, not persisted automatically
- Use \`${platformCoreTools.listWorkflows}\` to see existing workflows
- Use \`${platformCoreTools.getWorkflow}\` to retrieve a workflow for modification
- Update operations require \`confirm: true\` for safety
- The LLM will retry up to 3 times if validation fails
- Child workflows can access parent context via \`{{ parent.workflowId }}\`

## Example conversation
**User**: "Create a workflow that checks Elasticsearch health every hour and sends an email if the cluster is yellow or red"

**Assistant**: Let me generate that workflow for you.
\`\`\`
platform.workflow_generation({
  operation: "generate",
  description: "Check Elasticsearch cluster health every hour. If status is yellow or red, send an email notification to the ops team.",
  workflowName: "cluster-health-monitor"
})
\`\`\`

**User**: "I want to build a pipeline that retrieves alerts from multiple sources, processes them, and notifies different channels based on severity"

**Assistant**: I'll create a composition-based pipeline. First, let me generate the reusable retrieval workflows, then an orchestration workflow that composes them.
\`\`\`
platform.workflow_generation({
  operation: "generate",
  description: "Create a reusable alert retrieval workflow with inputs: timeRange (string, required), severity (choice: low/medium/high/critical, optional). Outputs: alerts (array), count (number). Search alerts-* index and emit results via workflow.output.",
  workflowName: "alert-retrieval"
})
\`\`\`
`,
  tools: [PLATFORM_WORKFLOW_GENERATION_TOOL],
};
