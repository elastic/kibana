/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffLines } from 'diff';
import { z } from '@kbn/zod/v4';
import { WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';

const workflowYamlDiffStatusSchema = z.enum(['pending', 'accepted', 'declined']);

const workflowYamlDiffDataSchema = z.object({
  beforeYaml: z.string().describe('Original workflow YAML content before the proposed change'),
  afterYaml: z.string().describe('Proposed workflow YAML content after the change'),
  proposalId: z
    .string()
    .describe('Stable proposal identifier linking chat diff and Monaco proposal'),
  status: workflowYamlDiffStatusSchema.default('pending'),
  workflowId: z.string().optional().describe('The workflow ID'),
  name: z.string().optional().describe('The workflow name'),
});

type WorkflowYamlDiffData = z.infer<typeof workflowYamlDiffDataSchema>;

const buildUnifiedDiff = (beforeYaml: string, afterYaml: string): string => {
  const parts = diffLines(beforeYaml, afterYaml);
  const result: string[] = [];

  for (const part of parts) {
    const lines = part.value.replace(/\n$/, '').split('\n');
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    for (const line of lines) {
      result.push(`${prefix}${line}`);
    }
  }

  return result.join('\n');
};

const workflowYamlDiffAttachmentType = {
  id: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  validate: (input: unknown) => {
    const parseResult = workflowYamlDiffDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true as const, data: parseResult.data };
    }
    return { valid: false as const, error: parseResult.error.message };
  },
  format: (attachment: { data: WorkflowYamlDiffData }) => {
    const { data } = attachment;
    const statusLabel = data.status.toUpperCase();
    const diff = buildUnifiedDiff(data.beforeYaml, data.afterYaml);

    return {
      getRepresentation: () => ({
        type: 'text' as const,
        value: `Workflow YAML proposed diff
Proposal ID: ${data.proposalId}
Status: ${statusLabel}

\`\`\`diff
${diff}
\`\`\`

If the proposal is pending, user can accept or decline it from the workflow YAML diff attachment UI.`,
      }),
    };
  },
  getAgentDescription: () =>
    `${WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE} attachments represent a proposed change to an Elastic Workflow.\n` +
    `Workflow edit tools return a diffAttachmentId in their result. ` +
    `You MUST render it in your response using <render_attachment id="{diffAttachmentId}"/> ` +
    `(replacing {diffAttachmentId} with the actual ID from the tool result) ` +
    `so the user sees the colored diff hunks and accept/decline buttons.\n` +
    `Do NOT paste the raw diff text — the rendered attachment provides the interactive UI.`,
};

export function registerWorkflowYamlDiffAttachment(agentBuilder: AgentBuilderPluginSetup): void {
  agentBuilder.attachments.registerType(
    workflowYamlDiffAttachmentType as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
}
