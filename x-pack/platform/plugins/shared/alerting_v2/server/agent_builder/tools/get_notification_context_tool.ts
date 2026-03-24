/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { StepParamSummary } from '@kbn/workflows';
import { buildStepParamsSummary } from '@kbn/workflows';
import {
  addDynamicConnectorsToCache,
  getAllConnectors,
} from '@kbn/workflows-management-plugin/common/schema';
import type { ScopedServicesFactory } from '../scoped_services';

const getNotificationContextSchema = z.object({});

export const getNotificationContextTool = (
  getScopedServices: ScopedServicesFactory,
  workflowsApi: WorkflowsManagementApi
): BuiltinToolDefinition<typeof getNotificationContextSchema> => ({
  id: `${internalNamespaces.alertingV2}.get_notification_context`,
  type: ToolType.builtin,
  description:
    'Fetch all context needed to propose a notification policy in one call. Returns three sections:\n' +
    '- policies: existing notification policies that route alert episodes to workflows.\n' +
    '- workflows: existing workflow definitions (used by notification policies to orchestrate ' +
    'notifications). Pass a workflowId here to propose_notification_policy with source "existing".\n' +
    '- connectors: configured third-party integrations like Slack, email, PagerDuty (used inside ' +
    'workflow YAML via the connector-id step field to send messages). Each connector includes ' +
    'withParams describing the required/optional fields for the "with" block in workflow YAML. ' +
    'Do NOT pass a connectorId to propose_notification_policy — connectors belong inside the ' +
    'workflow YAML, not at the policy level.',
  tags: ['alerting', 'notifications'],
  schema: getNotificationContextSchema,
  handler: async (_params, { spaceId, request }) => {
    const { notificationPolicyClient } = await getScopedServices(request);

    const [policiesResult, workflowsResult, connectorsResult] = await Promise.all([
      notificationPolicyClient.findNotificationPolicies({ page: 1, perPage: 20 }),
      workflowsApi.getWorkflows({ size: 20, page: 1 }, spaceId),
      workflowsApi.getAvailableConnectors(spaceId, request),
    ]);

    const workflows = workflowsResult.results.map((w) => ({
      workflowId: w.id,
      name: w.name,
      description: w.description,
      tags: w.tags,
      enabled: w.enabled,
    }));

    const enabledConnectorTypes = Object.fromEntries(
      Object.entries(connectorsResult.connectorsByType).filter(([, info]) => info.enabled !== false)
    );
    addDynamicConnectorsToCache(enabledConnectorTypes);
    const allConnectorContracts = getAllConnectors();
    const contractsByType = new Map(allConnectorContracts.map((c) => [c.type, c]));

    const connectorEntries = Object.entries(connectorsResult.connectorsByType);
    const connectors = connectorEntries.flatMap(([type, typeInfo]) => {
      const baseStepType = type.replace(/^\./, '');
      const stepTypes =
        (typeInfo as any).subActions?.length > 0
          ? (typeInfo as any).subActions.map((sa: { name: string }) => `${baseStepType}.${sa.name}`)
          : [baseStepType];

      const contract = contractsByType.get(baseStepType);
      let withParams: StepParamSummary[] | undefined;
      if (contract) {
        const params = buildStepParamsSummary(contract.paramsSchema);
        if (params.length > 0) {
          withParams = params;
        }
      }

      return ((typeInfo as any).instances ?? []).map((instance: { id: string; name: string }) => ({
        connectorId: instance.id,
        name: instance.name,
        actionTypeId: type,
        stepTypes,
        ...(withParams ? { withParams } : {}),
      }));
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            policies: {
              _usedFor:
                'Notification policies route alert episodes to workflows. ' +
                'If a matching policy already exists, reuse it instead of creating a new one.',
              ...policiesResult,
            },
            workflows: {
              _usedFor:
                'Workflows orchestrate notifications. A notification policy references a workflow ' +
                'by its workflowId. Pass workflowId to propose_notification_policy with ' +
                'source "existing", or create an inline workflow with source "inline".',
              count: workflows.length,
              total: workflowsResult.total,
              items: workflows,
            },
            connectors: {
              _usedFor:
                'Connectors are third-party integrations (Slack, email, PagerDuty, etc.). ' +
                'They are used INSIDE workflow YAML via the "connector-id" step field. ' +
                'Each connector includes "withParams" listing the fields for the step "with" block. ' +
                'Do NOT pass a connectorId to propose_notification_policy — it expects a workflowId.',
              count: connectors.length,
              totalAvailable: connectorsResult.totalConnectors,
              items: connectors,
            },
          },
        },
      ],
    };
  },
});
