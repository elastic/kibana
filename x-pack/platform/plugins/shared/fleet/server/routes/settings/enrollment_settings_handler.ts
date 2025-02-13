/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { FLEET_SERVER_PACKAGE } from '../../../common/constants';

import type {
  GetEnrollmentSettingsResponse,
  AgentPolicy,
  EnrollmentSettingsFleetServerPolicy,
} from '../../../common/types';
import type { FleetRequestHandler, GetEnrollmentSettingsRequestSchema } from '../../types';
import { agentPolicyService, appContextService, downloadSourceService } from '../../services';
import { getFleetServerHostsForAgentPolicy } from '../../services/fleet_server_host';
import { getFleetProxy } from '../../services/fleet_proxies';
import { getFleetServerPolicies, hasFleetServersForPolicies } from '../../services/fleet_server';
import { getDataOutputForAgentPolicy } from '../../services/agent_policies';

export const getEnrollmentSettingsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetEnrollmentSettingsRequestSchema.query>
> = async (context, request, response) => {
  const agentPolicyId = request.query?.agentPolicyId;
  const settingsResponse: GetEnrollmentSettingsResponse = {
    fleet_server: {
      policies: [],
      has_active: false,
    },
  };
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  // Get all possible fleet server or scoped normal agent policies
  const { fleetServerPolicies, scopedAgentPolicy: scopedAgentPolicyResponse } =
    await getFleetServerOrAgentPolicies(soClient, agentPolicyId);
  const scopedAgentPolicy = scopedAgentPolicyResponse || {
    id: undefined,
    name: undefined,
    fleet_server_host_id: undefined,
    download_source_id: undefined,
    data_output_id: undefined,
  };
  // Check if there is any active fleet server enrolled into the fleet server policies policies
  if (fleetServerPolicies) {
    settingsResponse.fleet_server.policies = fleetServerPolicies;
    settingsResponse.fleet_server.has_active = await hasFleetServersForPolicies(
      esClient,
      appContextService.getInternalUserSOClientWithoutSpaceExtension(),
      fleetServerPolicies,
      true
    );
  }

  // Get download source
  // ignore errors if the download source is not found
  try {
    settingsResponse.download_source = await getDownloadSource(
      soClient,
      scopedAgentPolicy.download_source_id ?? undefined
    );
  } catch (e) {
    settingsResponse.download_source = undefined;
  }

  // Get download source proxy
  // ignore errors if the download source proxy is not found
  try {
    if (settingsResponse.download_source?.proxy_id) {
      settingsResponse.download_source_proxy = await getFleetProxy(
        soClient,
        settingsResponse.download_source.proxy_id
      );
    }
  } catch (e) {
    settingsResponse.download_source_proxy = undefined;
  }

  // Get associated fleet server host, or default one if it doesn't exist
  // `getFleetServerHostsForAgentPolicy` errors if there is no default, so catch it
  try {
    settingsResponse.fleet_server.host = await getFleetServerHostsForAgentPolicy(
      soClient,
      scopedAgentPolicy
    );
  } catch (e) {
    settingsResponse.fleet_server.host = undefined;
  }

  // If a fleet server host was found, get associated fleet server host proxy if any
  // ignore errors if the proxy is not found
  try {
    if (settingsResponse.fleet_server.host?.proxy_id) {
      settingsResponse.fleet_server.host_proxy = await getFleetProxy(
        soClient,
        settingsResponse.fleet_server.host.proxy_id
      );
    }
  } catch (e) {
    settingsResponse.fleet_server.host_proxy = undefined;
  }

  // Get associated output and proxy (if any) to use for Fleet Server enrollment
  try {
    if (settingsResponse.fleet_server.policies.length > 0) {
      const dataOutput = await getDataOutputForAgentPolicy(soClient, scopedAgentPolicy);
      if (dataOutput.type === 'elasticsearch' && dataOutput.hosts?.[0]) {
        settingsResponse.fleet_server.es_output = dataOutput;
        if (dataOutput.proxy_id) {
          settingsResponse.fleet_server.es_output_proxy = await getFleetProxy(
            soClient,
            dataOutput.proxy_id
          );
        }
      }
    }
  } catch (e) {
    settingsResponse.fleet_server.es_output = undefined;
    settingsResponse.fleet_server.es_output_proxy = undefined;
  }

  return response.ok({ body: settingsResponse });
};

export const getFleetServerOrAgentPolicies = async (
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string
): Promise<{
  fleetServerPolicies?: EnrollmentSettingsFleetServerPolicy[];
  scopedAgentPolicy?: EnrollmentSettingsFleetServerPolicy;
}> => {
  const mapPolicy = (policy: AgentPolicy) => ({
    id: policy.id,
    name: policy.name,
    is_managed: policy.is_managed,
    is_default_fleet_server: policy.is_default_fleet_server,
    has_fleet_server: policy.has_fleet_server,
    fleet_server_host_id: policy.fleet_server_host_id,
    download_source_id: policy.download_source_id,
    space_ids: policy.space_ids,
    data_output_id: policy.data_output_id,
  });

  // If an agent policy is specified, return only that policy
  if (agentPolicyId) {
    const agentPolicy = await agentPolicyService.get(soClient, agentPolicyId, true);
    if (agentPolicy) {
      if (agentPolicy.package_policies?.find((p) => p.package?.name === FLEET_SERVER_PACKAGE)) {
        return {
          fleetServerPolicies: [mapPolicy(agentPolicy)],
          scopedAgentPolicy: mapPolicy(agentPolicy),
        };
      } else {
        return {
          scopedAgentPolicy: mapPolicy(agentPolicy),
        };
      }
    }
    return {};
  }

  // If an agent policy is not specified, return all fleet server policies
  const fleetServerPolicies = (
    await getFleetServerPolicies(appContextService.getInternalUserSOClientWithoutSpaceExtension())
  ).map(mapPolicy);
  return { fleetServerPolicies };
};

export const getDownloadSource = async (
  soClient: SavedObjectsClientContract,
  downloadSourceId?: string
): Promise<Promise<GetEnrollmentSettingsResponse['download_source']>> => {
  const sources = await downloadSourceService.list(soClient);
  const foundSource = downloadSourceId
    ? sources.items.find((s) => s.id === downloadSourceId)
    : undefined;
  return foundSource || sources.items.find((s) => s.is_default);
};
