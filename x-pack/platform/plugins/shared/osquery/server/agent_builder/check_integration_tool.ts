/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { osqueryTool, agentBuilderToolsAvailability } from './common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import { fetchOsqueryPackagePolicyIds } from '../routes/utils';

export const CHECK_INTEGRATION_TOOL_ID = osqueryTool('check_integration');

const checkIntegrationSchema = z.object({
  agent_id: z
    .string()
    .optional()
    .describe(
      'Specific agent ID to check enrollment status for. If omitted, checks fleet-wide enrollment.'
    ),
});

interface IntegrationStatus {
  installed: boolean;
  version?: string;
  agents_enrolled: boolean;
  enrolled_count: number;
}

export const checkIntegrationTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof checkIntegrationSchema> => ({
  id: CHECK_INTEGRATION_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Check whether the Osquery integration is installed and whether osquerybeat agents are enrolled. Use this before any other osquery tool to determine if live host interrogation via Osquery is available. Returns installation status, version, and agent enrollment count.',
  schema: checkIntegrationSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (_input, { request, spaceId }) => {
    const packageService = osqueryContext.service.getPackageService()?.asInternalUser;
    const agentService = osqueryContext.service.getAgentService();

    if (!packageService) {
      logger.warn('PackageService unavailable — Osquery integration check failed');

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              installed: false,
              agents_enrolled: false,
              enrolled_count: 0,
            } satisfies IntegrationStatus,
          },
        ],
      };
    }

    const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
      osqueryContext,
      request
    );

    const packageInfo = await packageService.getInstallation(
      OSQUERY_INTEGRATION_NAME,
      spaceScopedClient
    );

    if (!packageInfo?.install_version) {
      logger.debug('Osquery integration is not installed');

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              installed: false,
              agents_enrolled: false,
              enrolled_count: 0,
            } satisfies IntegrationStatus,
          },
        ],
      };
    }

    const policyIds = await fetchOsqueryPackagePolicyIds(spaceScopedClient, osqueryContext);

    if (policyIds.length === 0) {
      logger.debug('Osquery integration installed but no package policies in this space');

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              installed: true,
              version: packageInfo.install_version,
              agents_enrolled: false,
              enrolled_count: 0,
            } satisfies IntegrationStatus,
          },
        ],
      };
    }

    // policyIds are the osquery *package* policy ids; agents are enrolled under the parent
    // *agent* policy that references them, so resolve those before listing agents.
    let enrolledCount = 0;
    if (agentService) {
      try {
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();
        if (packagePolicyService) {
          const policyPackages = await packagePolicyService.getByIDs(spaceScopedClient, policyIds);

          const agentPolicyIds = [
            ...new Set(
              policyPackages?.flatMap((p: { policy_ids?: string[] }) => p.policy_ids ?? []) ?? []
            ),
          ];

          if (agentPolicyIds.length > 0) {
            const agents = await agentService.asInternalScopedUser(spaceId).listAgents({
              kuery: agentPolicyIds.map((id) => `policy_id:${id}`).join(' OR '),
              perPage: 1,
              showInactive: false,
            });

            enrolledCount = agents?.total ?? 0;
          }
        }
      } catch (e) {
        logger.warn(`Failed to query enrolled agents: ${e}`);
      }
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            installed: true,
            version: packageInfo.install_version,
            agents_enrolled: enrolledCount > 0,
            enrolled_count: enrolledCount,
          } satisfies IntegrationStatus,
        },
      ],
    };
  },
  tags: ['security', 'osquery', 'integration-status'],
});
