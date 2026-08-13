/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';
import type { AnalyzeAndImproveContext, AnalyzeChatOptions } from './types';

/**
 * Mirrors `WORKFLOW_YAML_ATTACHMENT_TYPE` from `@kbn/workflows` and the Workflows Management public
 * API version. Inlined as plain strings so Context Engine's browser build does not take a dependency
 * on Workflows Management just for two constants. Keep in sync with the source of truth.
 */
const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';
const WORKFLOWS_PUBLIC_API_VERSION = '2023-10-31';

interface WorkflowYaml {
  workflowId: string;
  name?: string;
  yaml: string;
}

/**
 * Reads one linked workflow's YAML via the RBAC-enforced public Workflows API
 * (`GET /api/workflows/workflow/{id}`), running as the current user. Returns `undefined` when the
 * user cannot read the workflow (403/404) or on any error, so a single inaccessible workflow never
 * aborts the hand-off.
 */
export const fetchWorkflowYaml = async (
  http: HttpStart,
  workflowId: string
): Promise<WorkflowYaml | undefined> => {
  try {
    const workflow = await http.get<{ id: string; name?: string; yaml?: string }>(
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}`,
      { version: WORKFLOWS_PUBLIC_API_VERSION }
    );
    if (!workflow?.yaml) {
      return undefined;
    }
    return { workflowId, name: workflow.name, yaml: workflow.yaml };
  } catch {
    return undefined;
  }
};

const buildIndexSummary = (aiIndex: AiIndexHttpItem, omittedWorkflowCount: number): string => {
  const lines: Array<string | undefined> = [
    `AI index: ${aiIndex.id}${aiIndex.managed ? ' (managed)' : ''}`,
    aiIndex.description ? `Description: ${aiIndex.description}` : undefined,
    `Dest: ${aiIndex.dest.type} ${aiIndex.dest.value}`,
    aiIndex.sources.length
      ? `Sources:\n${aiIndex.sources
          .map((source) => `- ${source.type}: ${source.value}`)
          .join('\n')}`
      : 'Sources: none',
    aiIndex.automations.length
      ? `Automations (linked workflows):\n${aiIndex.automations
          .map((automation) => `- ${automation.type}: ${automation.value}`)
          .join('\n')}`
      : 'Automations: none',
    omittedWorkflowCount > 0
      ? `Note: ${omittedWorkflowCount} linked workflow(s) you cannot access were omitted.`
      : undefined,
  ];
  return lines.filter((line): line is string => Boolean(line)).join('\n');
};

/**
 * Builds the Agent Builder `openChat` options for an "Analyze & improve" hand-off using built-in
 * attachment types: a `text` attachment with the AI index summary, plus one `workflow.yaml`
 * attachment (by value) for each linked workflow the user can read. Workflow YAML is fetched with
 * the current user's privileges, so a user can only ever attach workflows they are allowed to read.
 */
export const createBuildAnalyzeChat =
  (http: HttpStart) =>
  async ({ aiIndex }: AnalyzeAndImproveContext): Promise<AnalyzeChatOptions> => {
    const workflowIds = aiIndex.automations
      .filter((automation) => automation.type === 'workflow')
      .map((automation) => automation.value);

    // `fetchWorkflowYaml` never rejects (it resolves to `undefined` on error), so one inaccessible
    // or failing workflow does not abort the whole hand-off.
    const fetched = await Promise.all(workflowIds.map((id) => fetchWorkflowYaml(http, id)));
    const workflows = fetched.filter(
      (workflow): workflow is WorkflowYaml => workflow !== undefined
    );
    const omittedWorkflowCount = workflowIds.length - workflows.length;

    const attachments: AttachmentInput[] = [
      {
        id: `context-engine-ai-index:${aiIndex.id}`,
        type: AttachmentType.text,
        data: { content: buildIndexSummary(aiIndex, omittedWorkflowCount) },
      },
      ...workflows.map(
        (workflow): AttachmentInput => ({
          id: `workflow:${workflow.workflowId}`,
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          data: { yaml: workflow.yaml, workflowId: workflow.workflowId, name: workflow.name },
        })
      ),
    ];

    return {
      agentId: aiIndex.feedback_agent_id,
      newConversation: true,
      // Per-index session so each AI index's analysis is its own conversation instead of colliding
      // on Agent Builder's shared 'default' session for the agent (which would bleed one index's
      // context into another's). `context.tag` is reserved for future group-scoped analysis.
      sessionTag: `context-engine-feedback:${aiIndex.id}`,
      attachments,
    };
  };
