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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { osqueryTool, agentBuilderToolsAvailability } from './common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import {
  buildOsqueryPolicyKuery,
  getOsqueryAgentPolicyIds,
} from '../lib/get_osquery_agent_policy_ids';
import { EXECUTABLE_AGENT_STATUSES } from './agent_statuses';
import { hasOsqueryToolPrivilege, unauthorizedToolResult } from './tool_authz';

export const CHECK_INTEGRATION_TOOL_ID = osqueryTool('check_integration');

const checkIntegrationSchema = z.object({
  agent_id: z
    .string()
    .max(64)
    .optional()
    .describe(
      'Specific agent ID to check Osquery capability for (max 64 chars). If omitted, checks space-wide enrollment.'
    ),
});

/**
 * `unknown` is distinct from `false`: a Fleet or package-policy lookup failure
 * must not be reported with the same shape as a healthy environment that simply
 * has no agents, or the agent will tell the analyst Osquery is undeployed when
 * the truth is the check never completed.
 */
type EnrollmentStatus = 'enrolled' | 'not_enrolled' | 'unknown';

interface IntegrationStatus {
  installed: boolean;
  version?: string;
  agents_enrolled: boolean;
  enrolled_count: number;
  enrollment_status: EnrollmentStatus;
  agent_id?: string;
  agent_osquery_capable?: boolean;
  error?: string;
  guidance?: string;
}

/**
 * Complete KQL literal escaping for exact-match lookups: backslashes and
 * quotes first (so they cannot break out of the quoted literal), then
 * wildcard metacharacters (so `*`/`?` cannot expand inside it).
 */
const escapeKueryExact = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/([*?])/g, '\\$1');

const toolResult = (data: IntegrationStatus) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.other as const,
      data,
    },
  ],
});

export const checkIntegrationTool = (
  osqueryContext: OsqueryAppContext,
  logger: Logger
): BuiltinToolDefinition<typeof checkIntegrationSchema> => ({
  id: CHECK_INTEGRATION_TOOL_ID,
  type: ToolType.builtin,
  annotations: {
    title: 'Check Osquery Integration',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description:
    'Check whether the Osquery integration is installed and whether osquerybeat agents are enrolled. Use this before any other osquery tool to determine if live host interrogation via Osquery is available. Pass agent_id to check whether one specific host can run Osquery queries. Returns installation status, version, agent enrollment count, and an enrollment_status of enrolled / not_enrolled / unknown.',
  schema: checkIntegrationSchema,
  availability: agentBuilderToolsAvailability(osqueryContext),
  handler: async (input, { request }) => {
    const { agent_id: agentId } = input;

    if (!(await hasOsqueryToolPrivilege(osqueryContext, request, 'read'))) {
      return unauthorizedToolResult('read');
    }

    const packageService = osqueryContext.service.getPackageService()?.asInternalUser;
    const agentService = osqueryContext.service.getAgentService();

    if (!packageService) {
      logger.warn('PackageService unavailable — Osquery integration check failed');

      return toolResult({
        installed: false,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'unknown',
        error:
          'Fleet PackageService is unavailable, so integration status could not be determined.',
      });
    }

    const space = await osqueryContext.service.getActiveSpace(request);
    const spaceId = space?.id ?? DEFAULT_SPACE_ID;
    const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
      osqueryContext,
      request
    );

    let packageInfo;
    try {
      packageInfo = await packageService.getInstallation(
        OSQUERY_INTEGRATION_NAME,
        spaceScopedClient
      );
    } catch (e) {
      logger.warn(`Failed to read Osquery installation: ${e}`);

      return toolResult({
        installed: false,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'unknown',
        error: `Could not read the Osquery integration installation: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
    }

    if (!packageInfo?.install_version) {
      logger.debug('Osquery integration is not installed');

      return toolResult({
        installed: false,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'not_enrolled',
      });
    }

    const { agentPolicyIds, lookupFailed } = await getOsqueryAgentPolicyIds(
      spaceScopedClient,
      osqueryContext
    );

    if (lookupFailed) {
      return toolResult({
        installed: true,
        version: packageInfo.install_version,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'unknown',
        error:
          'The Osquery package policy lookup failed, so agent enrollment could not be determined. This is not the same as having no enrolled agents.',
      });
    }

    if (agentPolicyIds.length === 0) {
      logger.debug('Osquery integration installed but no package policies in this space');

      return toolResult({
        installed: true,
        version: packageInfo.install_version,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'not_enrolled',
        ...(agentId && { agent_id: agentId, agent_osquery_capable: false }),
        guidance:
          'Osquery is installed but no agent policy in this space includes it, so no host can be queried live. Use the ES|QL / Defend telemetry path, and tell the analyst live interrogation needs the Osquery integration added to an agent policy.',
      });
    }

    if (!agentService) {
      return toolResult({
        installed: true,
        version: packageInfo.install_version,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'unknown',
        error: 'Fleet AgentService is unavailable, so agent enrollment could not be determined.',
      });
    }

    const policyKuery = buildOsqueryPolicyKuery(agentPolicyIds);
    const scopedAgentClient = agentService.asInternalScopedUser(spaceId);

    try {
      // A specific agent_id answers a different question than the space-wide
      // count: "can THIS host run Osquery", i.e. is it enrolled in a policy
      // that carries the integration.
      if (agentId) {
        // escapeKueryExact covers backslash, quote, and wildcard metachars;
        // exact identity is still verified below as defense in depth.
        const escapedAgentId = escapeKueryExact(agentId);
        const { agents } = await scopedAgentClient.listAgents({
          kuery: `agent.id:"${escapedAgentId}" and (${policyKuery})`,
          perPage: 1,
          sortField: 'enrolled_at',
          sortOrder: 'desc',
          showInactive: true,
        });

        const capable = (agents ?? []).some(
          (agent) => agent.id === agentId && EXECUTABLE_AGENT_STATUSES.has(agent.status ?? '')
        );

        return toolResult({
          installed: true,
          version: packageInfo.install_version,
          agents_enrolled: capable,
          enrolled_count: capable ? 1 : 0,
          enrollment_status: capable ? 'enrolled' : 'not_enrolled',
          agent_id: agentId,
          agent_osquery_capable: capable,
          ...(!capable && {
            guidance: `Agent ${agentId} is not enrolled in an Osquery-capable agent policy, so live queries cannot run on it. Use the ES|QL / Defend telemetry path for this host.`,
          }),
        });
      }

      // Same executable-status contract as resolve_agent_ids: showInactive only
      // excludes `inactive`, so filter to statuses that can run a query.
      const executableKuery = [...EXECUTABLE_AGENT_STATUSES].map((s) => `status:${s}`).join(' or ');
      const agents = await scopedAgentClient.listAgents({
        kuery: `(${executableKuery}) and (${policyKuery})`,
        perPage: 1,
        showInactive: false,
      });

      const enrolledCount = agents?.total ?? 0;

      return toolResult({
        installed: true,
        version: packageInfo.install_version,
        agents_enrolled: enrolledCount > 0,
        enrolled_count: enrolledCount,
        enrollment_status: enrolledCount > 0 ? 'enrolled' : 'not_enrolled',
        ...(enrolledCount === 0 && {
          guidance:
            'Osquery is installed but no agents are currently enrolled in an Osquery-capable policy. Answer from ES|QL / Defend telemetry and tell the analyst live host interrogation is unavailable until an agent enrolls.',
        }),
      });
    } catch (e) {
      logger.warn(`Failed to query enrolled agents: ${e}`);

      return toolResult({
        installed: true,
        version: packageInfo.install_version,
        agents_enrolled: false,
        enrolled_count: 0,
        enrollment_status: 'unknown',
        ...(agentId && { agent_id: agentId }),
        error: `Agent enrollment lookup failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },
  tags: ['security', 'osquery', 'integration-status'],
});
