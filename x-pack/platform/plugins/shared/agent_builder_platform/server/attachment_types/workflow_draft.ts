/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { parse } from 'yaml';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { WorkflowSchema } from '@kbn/workflows/spec/schema';

/**
 * Attachment type ID for workflow drafts.
 */
export const WORKFLOW_DRAFT_ATTACHMENT_TYPE = 'workflow_draft';

/**
 * Schema for workflow draft attachment data.
 */
export const workflowDraftAttachmentDataSchema = z.object({
  /**
   * The raw YAML content of the workflow.
   */
  yaml: z.string(),
  /**
   * The workflow name (extracted from YAML).
   */
  name: z.string().optional(),
  /**
   * The workflow description (extracted from YAML).
   */
  description: z.string().optional(),
});

/**
 * Data for a workflow draft attachment.
 */
export type WorkflowDraftAttachmentData = z.infer<typeof workflowDraftAttachmentDataSchema>;

/**
 * Creates the definition for the `workflow_draft` attachment type.
 *
 * This attachment type is used to preview generated workflows before creation.
 * It includes:
 * - Visual preview via React component (WorkflowDraftViewer)
 * - Embedded create tool for workflow creation
 * - Skill content with guidance for the agent
 */
export const createWorkflowDraftAttachmentType = (): AttachmentTypeDefinition<
  typeof WORKFLOW_DRAFT_ATTACHMENT_TYPE,
  WorkflowDraftAttachmentData
> => {
  return {
    id: WORKFLOW_DRAFT_ATTACHMENT_TYPE,

    validate: (input) => {
      // First validate the schema
      const schemaResult = workflowDraftAttachmentDataSchema.safeParse(input);
      if (!schemaResult.success) {
        return { valid: false, error: schemaResult.error.message };
      }

      const { yaml } = schemaResult.data;

      // Parse and validate the YAML against the Workflow schema
      let parsed: unknown;
      try {
        parsed = parse(yaml);
      } catch (parseError) {
        return {
          valid: false,
          error: `Invalid YAML syntax: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        };
      }

      const workflowResult = WorkflowSchema.safeParse(parsed);
      if (!workflowResult.success) {
        return {
          valid: false,
          error: `Invalid workflow definition: ${workflowResult.error.message}`,
        };
      }

      // Extract name and description from parsed workflow
      const workflow = workflowResult.data;
      return {
        valid: true,
        data: {
          yaml,
          name: workflow.name,
          description: workflow.description,
        },
      };
    },

    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatWorkflowDraft(attachment.data),
      }),
    }),

    getTools: () => [platformCoreTools.workflows],

    getAgentDescription: () =>
      'A workflow draft is attached with visual preview. The user can see the workflow structure and confirm creation.',

    // Skills to reference when this attachment is present
    skills: ['platform.search'],

    // LLM guidance for handling workflow drafts
    skillContent: `# Workflow Draft

A workflow has been generated and is ready for review. The user can see a visual preview of the workflow in the conversation.

## Important Guidelines
- DO NOT immediately create the workflow - wait for user confirmation
- Ask if they want to:
  1. Create the workflow as-is
  2. Make modifications to the workflow
  3. Discard and start over
- If the user requests changes, generate a new workflow draft with the modifications
- Only use the workflow create tool after the user explicitly confirms they want to create it

## Available Actions
- Create the workflow using the workflows tool with the 'create' operation
- Generate a new workflow draft if changes are requested`,

    // React component for visual preview (lazy-loaded)
    component: {
      render: () =>
        import('../public/components/workflow_draft_viewer').then((m) => m.WorkflowDraftViewer),
      displayMode: 'expanded',
      minHeight: 450,
    },
  };
};

/**
 * Formats workflow draft data for LLM representation.
 */
const formatWorkflowDraft = (data: WorkflowDraftAttachmentData): string => {
  const parts: string[] = [];

  if (data.name) {
    parts.push(`## Workflow Draft: ${data.name}`);
  } else {
    parts.push('## Workflow Draft');
  }

  if (data.description) {
    parts.push(`\n${data.description}`);
  }

  parts.push('\n```yaml');
  parts.push(data.yaml);
  parts.push('```');

  return parts.join('\n');
};
