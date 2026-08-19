/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import { z } from '@kbn/zod/v4';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { workflowTools } from '../../common/constants';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

const clientDiagnosticSchema = z.object({
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  source: z.string(),
});

const workflowYamlDataSchema = z.object({
  yaml: z.string().describe('The workflow YAML content'),
  workflowId: z.string().optional().describe('The workflow ID'),
  name: z.string().optional().describe('The workflow name'),
  clientDiagnostics: z
    .array(clientDiagnosticSchema)
    .optional()
    .describe('Client-side validation diagnostics from the editor'),
});

type WorkflowYamlData = z.infer<typeof workflowYamlDataSchema>;

const workflowYamlOriginSchema = z.string().describe('The workflow ID to resolve');

const createWorkflowYamlAttachmentType = (api: WorkflowsManagementApi) => ({
  id: WORKFLOW_YAML_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input: unknown) => {
    const parseResult = workflowYamlDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true as const, data: parseResult.data };
    }
    return { valid: false as const, error: parseResult.error.message };
  },
  validateOrigin: (input: unknown) => {
    const parseResult = workflowYamlOriginSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true as const, data: parseResult.data };
    }
    return { valid: false as const, error: parseResult.error.message };
  },
  resolve: async (
    origin: string,
    context: AttachmentResolveContext
  ): Promise<WorkflowYamlData | undefined> => {
    const workflow = await api.getWorkflow(origin, context.spaceId);
    if (!workflow) return undefined;
    return { yaml: workflow.yaml, workflowId: workflow.id, name: workflow.name };
  },
  format: (attachment: { data: WorkflowYamlData }, context: AttachmentFormatContext) => {
    const { data } = attachment;
    return {
      getRepresentation: async (): Promise<{ type: 'text'; value: string }> => {
        let validationSection = '';
        try {
          const result = await api.validateWorkflow(data.yaml, context.spaceId, context.request);
          if (result.valid) {
            validationSection = '\n\nValidation: valid';
          } else {
            const errors = result.diagnostics.filter(
              (d: { severity: string }) => d.severity === 'error'
            );
            const warnings = result.diagnostics.filter(
              (d: { severity: string }) => d.severity === 'warning'
            );
            const errorLines = errors
              .map(
                (d: { source: string; message: string; path?: Array<string | number> }) =>
                  `- [${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`
              )
              .join('\n');
            validationSection = `\n\nValidation errors (${errors.length}):\n${errorLines}`;
            if (warnings.length > 0) {
              const warningLines = warnings
                .map(
                  (d: { source: string; message: string; path?: Array<string | number> }) =>
                    `- [${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`
                )
                .join('\n');
              validationSection += `\n\nValidation warnings (${warnings.length}):\n${warningLines}`;
            }
          }
        } catch {
          // Validation service unavailable; LLM can use validate_workflow tool.
        }

        if (data.clientDiagnostics && data.clientDiagnostics.length > 0) {
          const clientErrors = data.clientDiagnostics.filter((d) => d.severity === 'error');
          const clientWarnings = data.clientDiagnostics.filter((d) => d.severity === 'warning');
          if (clientErrors.length > 0) {
            const lines = clientErrors.map((d) => `- [${d.source}] ${d.message}`).join('\n');
            validationSection += `\n\nClient-side validation errors (${clientErrors.length}):\n${lines}`;
          }
          if (clientWarnings.length > 0) {
            const lines = clientWarnings.map((d) => `- [${d.source}] ${d.message}`).join('\n');
            validationSection += `\n\nClient-side validation warnings (${clientWarnings.length}):\n${lines}`;
          }
        }

        return {
          type: 'text' as const,
          value:
            `Current Workflow YAML:\n\n\`\`\`yaml\n${data.yaml}\n\`\`\`` +
            `${validationSection}\n\n` +
            `Use \`${platformCoreTools.generateWorkflow}\` to create or modify this workflow. It emits a diff card in chat and updates this attachment.\n` +
            `Use \`${platformCoreTools.executeWorkflow}\` with \`attachmentId\` set to this attachment's id to run this workflow end-to-end (no save required).\n` +
            `Render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>.`,
        };
      },
    };
  },
  getTools: () => [
    ...Object.values(workflowTools),
    platformCoreTools.generateWorkflow,
    platformCoreTools.executeWorkflow,
  ],
  getAgentDescription: () =>
    `${WORKFLOW_YAML_ATTACHMENT_TYPE} attachments hold the current Elastic Workflow YAML plus any validation diagnostics — both are inlined in the attachment content, do NOT call attachment_read to re-read them.\n\n` +
    `Editing: call \`${platformCoreTools.generateWorkflow}\` for any create/modify — it knows step types, connector types, and (via \`attachmentId\`) the current YAML, and returns \`diffAttachmentId\`, \`attachmentId\`, \`attachmentVersion\`. Never paste YAML in chat, never call attachments.add directly, never pre-fetch step definitions or connectors first. Load the \`workflow-authoring\` skill for YAML/Liquid/trigger reference or when debugging validation errors.\n\n` +
    `Rendering: emit <render_attachment id="{diffAttachmentId}"/> for the diff, and <render_attachment id="{attachmentId}" version="{attachmentVersion}"/> for the updated workflow (the version attribute is required so the UI shows the latest content).\n\n` +
    `For legacy/deprecated step types that appear in the existing YAML, call \`${workflowTools.getStepDefinitions}\` with the exact \`stepType\` or \`includeDeprecated: true\`. \`${platformCoreTools.generateWorkflow}\` does not know user index schemas — if the workflow contains an ES query step against a real index and the user wants to run or save it, call \`${workflowTools.executeStep}\` on that step after generation to verify it returns rows (do NOT pre-discover index fields).`,
});

export function registerWorkflowYamlAttachment(
  agentBuilder: AgentBuilderPluginSetup,
  api: WorkflowsManagementApi
): void {
  agentBuilder.attachments.registerType(
    createWorkflowYamlAttachmentType(api) as Parameters<
      typeof agentBuilder.attachments.registerType
    >[0]
  );
}
