/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { createInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';
import {
  buildOsqueryPolicyKuery,
  getOsqueryAgentPolicyIds,
} from '../lib/get_osquery_agent_policy_ids';
import { EXECUTABLE_AGENT_STATUSES } from './agent_statuses';

export const osqueryTool = (toolName: string): string =>
  `${internalNamespaces.osquery}.${toolName}`;

export const agentBuilderToolsAvailability = (
  osqueryContext: OsqueryAppContext
): ToolAvailabilityConfig => ({
  cacheMode: 'space',
  handler: async () => ({
    status: osqueryContext.experimentalFeatures.agentBuilderTools ? 'available' : 'unavailable',
    reason: osqueryContext.experimentalFeatures.agentBuilderTools
      ? undefined
      : 'Osquery Agent Builder tools are not enabled',
  }),
});

/**
 * Whether the live Osquery path is usable right now: the integration is
 * installed AND at least one agent in this space is enrolled in an
 * Osquery-capable policy. Mirrors the detection logic of
 * `check_integration_tool`, which stays available unconditionally — this
 * helper backs the availability gate that hides the live-path tools
 * (`run_live_query`, `resolve_agent_ids`, …) until the integration is
 * confirmed capable, so the agent must call `check_integration` to learn
 * capability instead of assuming it.
 *
 * Conservative by design: any lookup failure (Fleet/PackageService error)
 * returns `false`, keeping the live path hidden and forcing the agent onto
 * the ES|QL / Defend telemetry path rather than letting it dispatch a query
 * that cannot run.
 */
export const isOsqueryLiveCapable = async (
  osqueryContext: OsqueryAppContext,
  request: KibanaRequest
): Promise<boolean> => {
  if (!osqueryContext.experimentalFeatures.agentBuilderTools) {
    return false;
  }

  const packageService = osqueryContext.service.getPackageService()?.asInternalUser;
  const agentService = osqueryContext.service.getAgentService();
  if (!packageService || !agentService) {
    return false;
  }

  const space = await osqueryContext.service.getActiveSpace(request);
  const spaceId = space?.id ?? DEFAULT_SPACE_ID;
  const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
    osqueryContext,
    request
  );

  let packageInfo;
  try {
    packageInfo = await packageService.getInstallation(OSQUERY_INTEGRATION_NAME, spaceScopedClient);
  } catch {
    return false;
  }

  if (!packageInfo?.install_version) {
    return false;
  }

  const { agentPolicyIds, lookupFailed } = await getOsqueryAgentPolicyIds(
    spaceScopedClient,
    osqueryContext
  );
  if (lookupFailed || agentPolicyIds.length === 0) {
    return false;
  }

  try {
    // Same executable-status contract as resolve_agent_ids.
    const executableKuery = [...EXECUTABLE_AGENT_STATUSES].map((s) => `status:${s}`).join(' or ');
    const agents = await agentService.asInternalScopedUser(spaceId).listAgents({
      kuery: `(${executableKuery}) and (${buildOsqueryPolicyKuery(agentPolicyIds)})`,
      perPage: 1,
      showInactive: false,
    });

    return (agents?.total ?? 0) > 0;
  } catch {
    return false;
  }
};

/**
 * Availability gate for the Osquery live-interrogation tools. Unlike
 * `agentBuilderToolsAvailability` (feature-flag only), this also requires the
 * integration to be installed with an enrolled agent, so the live path is
 * hidden until `check_integration` — which stays unconditionally available —
 * has confirmed capability.
 *
 * `cacheMode: 'none'` because integration/enrollment state can change between
 * turns of one conversation and a stale "capable" cache would expose
 * `run_live_query` after the integration was removed.
 */
export const osqueryLivePathAvailability = (
  osqueryContext: OsqueryAppContext
): ToolAvailabilityConfig => ({
  cacheMode: 'none',
  handler: async ({ request }) => {
    if (!osqueryContext.experimentalFeatures.agentBuilderTools) {
      return { status: 'unavailable', reason: 'Osquery Agent Builder tools are not enabled' };
    }

    const capable = await isOsqueryLiveCapable(osqueryContext, request);

    return capable
      ? { status: 'available' }
      : {
          status: 'unavailable',
          reason:
            'Osquery live interrogation requires the Osquery integration installed with an enrolled agent. Call osquery.check_integration to confirm capability before using the live-query path; otherwise answer from ES|QL / Defend telemetry.',
        };
  },
});
