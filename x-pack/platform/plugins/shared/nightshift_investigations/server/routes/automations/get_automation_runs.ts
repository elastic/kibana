/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export type AutomationRunResult = 'started' | 'skipped' | 'failed' | 'running';

export interface AutomationRun {
  executionId: string;
  startedAt: string | null;
  triggeredBy: string | null;
  result: AutomationRunResult;
  /** Human-readable secondary text. Error message for failed, limit info for skipped. */
  resultDetail: string | null;
  /** Subject derived from trigger_investigation step input. Null for skipped/failed. */
  subject: string | null;
  investigationId: string | null;
}

// Copied from workflows_management/public/pages/executions/format_execution_table_values.ts
// Not exported from that plugin's public index.
const TRIGGER_LABELS: Record<string, string> = {
  'alerting.alertStateChanged': 'Alert state changed',
  manual: 'Manual',
  scheduled: 'Scheduled',
  api: 'API',
};

function formatTriggerLabel(triggeredBy: string | null | undefined): string | null {
  if (!triggeredBy) return null;
  return TRIGGER_LABELS[triggeredBy] ?? triggeredBy;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export const getAutomationRunsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations/{id}/runs',
  options: {
    access: 'internal',
    summary: 'Get automation runs',
    description: 'Returns paginated workflow execution history for a nightshift automation.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:write'] },
  },
  params: z.object({
    path: z.object({ id: z.string().min(1) }),
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      size: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  handler: async ({ request, params, getAutomationsSoClient, getWorkflowsManagement, context }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) {
      throw serverUnavailable('Workflows management is not available');
    }

    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    const so = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id
    );

    const { workflowId } = so.attributes;
    if (!workflowId) {
      return { runs: [], total: 0 };
    }

    const { page, size } = params.query;

    // Step 2: page of executions, default sort is [createdAt desc, id desc]
    const { results: executions, total } =
      await workflowsManagement.management.getWorkflowExecutions(
        { workflowId, page, size },
        spaceId
      );

    if (executions.length === 0) {
      return { runs: [], total };
    }

    // Step 3: bulk-fetch the two steps we care about for this page
    const executionIds = executions.map((e) => e.id);
    const { results: stepExecutions } =
      await workflowsManagement.management.searchStepExecutions(
        {
          workflowId,
          workflowExecutionIds: executionIds,
          sourceIncludes: ['workflowRunId', 'stepId', 'status', 'output', 'input'],
          size: executionIds.length * 2, // at most 2 steps per execution
        },
        spaceId
      );

    // Index step executions by workflowRunId:stepId for O(1) lookups
    const stepByRunAndStep = new Map<string, (typeof stepExecutions)[number]>();
    for (const step of stepExecutions) {
      stepByRunAndStep.set(`${step.workflowRunId}:${step.stepId}`, step);
    }

    // Step 4: fold into AutomationRun per execution
    const runs: AutomationRun[] = executions.map((execution) => {
      const trigStep = stepByRunAndStep.get(`${execution.id}:trigger_investigation`);
      const budgetStep = stepByRunAndStep.get(`${execution.id}:check_budget`);

      let result: AutomationRunResult;
      let resultDetail: string | null = null;
      let subject: string | null = null;
      let investigationId: string | null = null;

      if (execution.status === 'failed') {
        result = 'failed';
        if (execution.error) {
          resultDetail = execution.error.message ?? execution.error.type ?? null;
        }
      } else if (execution.status === 'running' || execution.status === 'pending') {
        result = 'running';
      } else if (trigStep) {
        // completed with trigger_investigation step present
        result = 'started';
        if (isPlainObject(trigStep.output)) {
          const inv = trigStep.output.investigation_id;
          if (typeof inv === 'string') {
            investigationId = inv;
          }
        }
        if (isPlainObject(trigStep.input)) {
          const ctx = trigStep.input.context;
          if (isPlainObject(ctx)) {
            const alerts = ctx.alerts;
            if (Array.isArray(alerts) && alerts.length > 0) {
              const first = alerts[0];
              if (isPlainObject(first)) {
                const ruleName = first.rule_name;
                if (typeof ruleName === 'string') {
                  subject = ruleName;
                }
              }
            }
          }
          if (!subject) {
            const summary = trigStep.input.summary;
            if (typeof summary === 'string') {
              subject = summary;
            }
          }
        }
      } else {
        // completed but no trigger_investigation step → budget declined
        result = 'skipped';
        const budgetOutput = budgetStep?.output;
        if (isPlainObject(budgetOutput)) {
          const { used, limit } = budgetOutput;
          if (typeof used === 'number' && typeof limit === 'number') {
            resultDetail = `Daily limit reached (${used} of ${limit})`;
          }
        }
      }

      return {
        executionId: execution.id,
        startedAt: execution.startedAt ?? null,
        triggeredBy: formatTriggerLabel(execution.triggeredBy),
        result,
        resultDetail,
        subject,
        investigationId,
      };
    });

    return { runs, total };
  },
});
