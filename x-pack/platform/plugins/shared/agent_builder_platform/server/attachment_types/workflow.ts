/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';

/**
 * Attachment type ID for workflows.
 */
export const WORKFLOW_ATTACHMENT_TYPE = 'workflow';

/**
 * Schema for workflow attachment data.
 */
export const workflowAttachmentDataSchema = z.object({
  /**
   * The workflow ID.
   */
  workflowId: z.string(),
  /**
   * The workflow name.
   */
  name: z.string(),
  /**
   * The workflow description.
   */
  description: z.string().optional(),
  /**
   * Whether the workflow is enabled.
   */
  enabled: z.boolean().optional(),
  /**
   * The workflow YAML definition.
   */
  yaml: z.string().optional(),
  /**
   * Optional execution ID if the workflow was just executed.
   */
  executionId: z.string().optional(),
});

/**
 * Data for a workflow attachment.
 */
export type WorkflowAttachmentData = z.infer<typeof workflowAttachmentDataSchema>;

/**
 * Creates the definition for the `workflow` attachment type.
 *
 * This attachment type is used for existing workflows with capabilities to:
 * - Run the workflow
 * - Check execution status
 * - View execution logs
 */
export const createWorkflowAttachmentType = (): AttachmentTypeDefinition<
  typeof WORKFLOW_ATTACHMENT_TYPE,
  WorkflowAttachmentData
> => {
  return {
    id: WORKFLOW_ATTACHMENT_TYPE,

    validate: (input) => {
      const schemaResult = workflowAttachmentDataSchema.safeParse(input);
      if (!schemaResult.success) {
        return { valid: false, error: schemaResult.error.message };
      }
      return { valid: true, data: schemaResult.data };
    },

    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatWorkflowData(attachment.data),
      }),
    }),

    getTools: () => [
      platformCoreTools.runWorkflow,
      platformCoreTools.getWorkflowExecutionStatus,
      platformCoreTools.getWorkflowExecutionLogs,
      platformCoreTools.getWorkflow,
    ],

    getAgentDescription: () =>
      'A workflow is attached. You can run it, check execution status, or view logs.',

    // Skills to reference when this attachment is present
    skills: ['platform.search'],

    // LLM guidance for handling workflows
    skillContent: `# Workflow Operations

A workflow is attached to this conversation. Here are the available operations:

## Available Actions
- **Run**: Execute the workflow with optional inputs (requires user confirmation)
- **Get Status**: Check the status of a workflow execution
- **Get Logs**: View detailed execution logs for debugging

## Safety Guidelines
- Always ask for user confirmation before running a workflow
- Use \`confirm: true\` parameter when executing
- If the workflow doesn't complete immediately, return the executionId and offer to check status later

## Workflow Details
The attached workflow includes:
- Workflow ID and name for reference
- Current enabled status
- Definition (if available)

## Example Flow
1. User asks to run the workflow
2. Summarize what the workflow does (from description/definition)
3. Ask for explicit confirmation
4. Execute with \`confirm: true\`
5. Report execution result or provide executionId for follow-up`,

    // React component for visual preview (lazy-loaded)
    component: {
      render: () =>
        import('../public/components/workflow_viewer').then((m) => m.WorkflowViewer),
      displayMode: 'expanded',
      minHeight: 300,
    },

    // Entity recognition patterns for auto-attachment
    entityRecognition: {
      patterns: [
        /workflow\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /run\s+workflow\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /execute\s+["']?([a-zA-Z0-9_-]+)["']?\s+workflow/i,
      ],
      extractId: (match) => match[1],
      resolve: async (entityId, context) => {
        // TODO: Implement resolution from workflows management API
        // This would query the workflow by ID
        return null;
      },
    },
  };
};

/**
 * Formats workflow data for LLM representation.
 */
const formatWorkflowData = (data: WorkflowAttachmentData): string => {
  const parts: string[] = [];

  parts.push(`## Workflow: ${data.name}`);
  parts.push(`**ID**: ${data.workflowId}`);

  if (data.description) {
    parts.push(`**Description**: ${data.description}`);
  }

  if (data.enabled !== undefined) {
    parts.push(`**Status**: ${data.enabled ? 'Enabled' : 'Disabled'}`);
  }

  if (data.executionId) {
    parts.push(`**Last Execution ID**: ${data.executionId}`);
  }

  if (data.yaml) {
    parts.push('\n**Definition**:');
    parts.push('```yaml');
    parts.push(data.yaml);
    parts.push('```');
  }

  return parts.join('\n');
};
