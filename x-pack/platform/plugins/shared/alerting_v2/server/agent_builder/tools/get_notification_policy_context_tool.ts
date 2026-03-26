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
import { AVAILABLE_PLACEHOLDERS } from './lib/generate_notification_workflow_yaml';

const schema = z.object({});

export const getNotificationPolicyContextTool = (
  getScopedServices: ScopedServicesFactory,
  workflowsApi: WorkflowsManagementApi
): BuiltinToolDefinition<typeof schema> => ({
  id: `${internalNamespaces.alertingV2}.get_notification_policy_context`,
  type: ToolType.builtin,
  description:
    'Fetch all context needed to draft a notification policy. Returns:\n' +
    '- policies: existing notification policies (reuse one if it already matches the rule).\n' +
    '- workflows: existing workflows that notification policies can route to. ' +
    'Pass a workflowId to draft_notification_policy with source "existing".\n' +
    '- connectors: configured integrations (Slack, email, PagerDuty, etc.) with their ' +
    'withParams describing the fields you must provide in the messages parameter of ' +
    'draft_notification_policy.\n' +
    '- placeholders: available template placeholders for message content ' +
    '(e.g. {ruleId}, {episodeId}) — the server expands them to Liquid syntax automatically.',
  tags: ['alerting', 'notifications'],
  schema,
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
        _usedFor:
          'Pass this connectorId and the first stepType to draft_notification_policy ' +
          'in the connector field. Use the withParams field names as keys in the messages ' +
          'parameter to specify what to send for each episode status.',
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
                'Workflows orchestrate notifications. A notification policy references a ' +
                'workflow by its workflowId. Pass workflowId to draft_notification_policy ' +
                'with source "existing" to reuse one.',
              count: workflows.length,
              total: workflowsResult.total,
              items: workflows,
            },
            connectors: {
              _usedFor:
                'Connectors are third-party integrations (Slack, email, PagerDuty). ' +
                'Pass the connectorId and type to draft_notification_policy in the ' +
                'connector field. Use the withParams names as keys in the messages object.',
              count: connectors.length,
              totalAvailable: connectorsResult.totalConnectors,
              items: connectors,
            },
            placeholders: {
              _usedFor:
                'Use these placeholders in message values passed to draft_notification_policy. ' +
                'The server expands them to the correct Liquid template syntax automatically.',
              items: AVAILABLE_PLACEHOLDERS,
            },
            _instruction:
              'You now have the context needed to draft a notification policy. ' +
              'If the user specified a channel, call draft_notification_policy immediately. ' +
              'If not, ask which channel they prefer based on the available connectors above, ' +
              'then call draft_notification_policy. Do NOT summarize this raw context to the user.',
          },
        },
      ],
    };
  },
});
