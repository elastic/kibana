/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, RequestHandler, ResponseHeaders } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import pMap from 'p-map';
import { dump } from 'js-yaml';

import { isEmpty } from 'lodash';

import { ALL_SPACES_ID, FIPS_AGENT_KUERY, inputsFormat } from '../../../common/constants';

import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';

import { fullAgentPolicyToYaml } from '../../../common/services';
import {
  appContextService,
  agentPolicyService,
  packagePolicyService,
  licenseService,
} from '../../services';
import { type AgentClient } from '../../services/agents';
import {
  AGENTS_PREFIX,
  MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10,
  UNPRIVILEGED_AGENT_KUERY,
} from '../../constants';
import type {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
  GetK8sManifestRequestSchema,
  FleetRequestHandler,
  BulkGetAgentPoliciesRequestSchema,
  AgentPolicy,
  FleetRequestHandlerContext,
  GetAgentPolicyOutputsRequestSchema,
  GetListAgentPolicyOutputsRequestSchema,
  GetAutoUpgradeAgentsStatusRequestSchema,
  CreateAgentAndPackagePolicyRequestSchema,
} from '../../types';

import type {
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
  GetOneAgentPolicyResponse,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  UpdateAgentPolicyResponse,
  CopyAgentPolicyResponse,
  DeleteAgentPolicyResponse,
  GetFullAgentPolicyResponse,
  GetFullAgentConfigMapResponse,
  GetFullAgentManifestResponse,
  BulkGetAgentPoliciesResponse,
  GetAgentPolicyOutputsResponse,
  GetListAgentPolicyOutputsResponse,
  CreatePackagePolicyRequest,
  PackagePolicy,
} from '../../../common/types';
import { AgentPolicyNotFoundError, FleetUnauthorizedError, FleetError } from '../../errors';
import { createAgentPolicyWithPackages } from '../../services/agent_policy_create';
import { updateAgentPolicySpaces } from '../../services/spaces/agent_policy';
import { packagePolicyToSimplifiedPackagePolicy } from '../../../common/services/simplified_package_policy_helper';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { getAutoUpgradeAgentsStatus } from '../../services/agents';
import { extractMinVersionFromRanges } from '../../services/agents/version_compatibility';
import { getPackageInfo } from '../../services/epm/packages';

import { createPackagePolicyHandler } from '../package_policy/handlers';
import { getLatestAgentAvailableDockerImageVersion } from '../../services/agents';

export async function populateAssignedAgentsCount(
  agentClient: AgentClient,
  agentPolicies: AgentPolicy[]
) {
  await pMap(
    agentPolicies,
    (agentPolicy: GetAgentPoliciesResponseItem) => {
      const totalAgents = agentClient
        .listAgents({
          showInactive: true,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:"${agentPolicy.id}"`,
        })
        .then(({ total }) => (agentPolicy.agents = total));
      const unprivilegedAgents = agentClient
        .listAgents({
          showInactive: true,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:"${agentPolicy.id}" and ${UNPRIVILEGED_AGENT_KUERY}`,
        })
        .then(({ total }) => (agentPolicy.unprivileged_agents = total));
      const fipsAgents = agentClient
        .listAgents({
          showInactive: true,
          perPage: 0,
          page: 1,
          kuery: `${AGENTS_PREFIX}.policy_id:"${agentPolicy.id}" and ${FIPS_AGENT_KUERY}`,
        })
        .then(({ total }) => (agentPolicy.fips_agents = total));
      return Promise.all([totalAgents, unprivilegedAgents, fipsAgents]);
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10 }
  );
}

function sanitizeItemForReadAgentOnly(item: AgentPolicy): AgentPolicy {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    revision: item.revision,
    namespace: item.namespace,
    is_managed: item.is_managed,
    is_protected: item.is_protected,
    status: item.status,
    updated_at: item.updated_at,
    updated_by: item.updated_by,
    has_fleet_server: item.has_fleet_server,
    monitoring_enabled: item.monitoring_enabled,
    package_policies: [],
  };
}

async function calculateMinAgentVersionForPolicy(
  packagePolicies: PackagePolicy[],
  soClient: SavedObjectsClientContract
): Promise<string | undefined> {
  const logger = appContextService.getLogger().get('calculateMinAgentVersionForPolicy');

  if (!packagePolicies || packagePolicies.length === 0) {
    return undefined;
  }

  // Collect all agent version requirements from package policies
  const versionRequirements: string[] = [];
  for (const packagePolicy of packagePolicies) {
    if (packagePolicy.package?.name && packagePolicy.package?.version) {
      try {
        const pkgInfo = await getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: packagePolicy.package.name,
          pkgVersion: packagePolicy.package.version,
          ignoreUnverified: true,
          prerelease: true,
        });
        if (pkgInfo?.conditions?.agent?.version) {
          versionRequirements.push(pkgInfo.conditions.agent.version);
        }
      } catch (error) {
        // If we can't get package info, skip this package policy
        logger.debug(
          `Could not get package info for ${packagePolicy.package.name}@${packagePolicy.package.version}, skipping agent version requirement`
        );
      }
    }
  }

  // Extract minimum version from all ranges (handles OR clauses and takes maximum across packages)
  return extractMinVersionFromRanges(versionRequirements);
}

export async function getAuthorizedSpacesWithAgentPoliciesAllPrivileges(
  request: KibanaRequest,
  context: FleetRequestHandlerContext
) {
  const security = appContextService.getSecurity();
  const spaces = await (await context.fleet).getAllSpaces();

  const allSpaceId = [...spaces.map(({ id }) => id), ALL_SPACES_ID];
  const res = await security.authz.checkPrivilegesWithRequest(request).atSpaces(allSpaceId, {
    kibana: [security.authz.actions.api.get(`fleet-agent-policies-all`)],
  });

  const authorizedSpaces = allSpaceId.filter(
    (id) =>
      res.privileges.kibana.find((privilege) => privilege.resource === id)?.authorized ?? false
  );

  return authorizedSpaces;
}

export const getAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const authzFleetReadAgentPolicies =
    request.authzResult?.[FLEET_API_PRIVILEGES.AGENT_POLICIES.READ] === true;
  const authzFleetAgentRead = request.authzResult?.[FLEET_API_PRIVILEGES.AGENTS.READ] === true;

  const soClient =
    authzFleetReadAgentPolicies || authzFleetAgentRead
      ? coreContext.savedObjects.client
      : fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const {
    full: withPackagePolicies = false,
    noAgentCount,
    withAgentCount,
    format,
    ...restOfQuery
  } = request.query;
  if (!authzFleetReadAgentPolicies && withPackagePolicies) {
    throw new FleetUnauthorizedError(
      'full query parameter require agent policies read permissions'
    );
  }
  const agentPoliciesResponse = await agentPolicyService.list(soClient, {
    withPackagePolicies,
    esClient,
    ...restOfQuery,
  });
  let { items } = agentPoliciesResponse;
  const { total, page, perPage } = agentPoliciesResponse;

  if (authzFleetAgentRead && (noAgentCount === false || withAgentCount)) {
    await populateAssignedAgentsCount(fleetContext.agentClient.asCurrentUser, items);
  }

  // Calculate min_agent_version for all items with package policies
  if (withPackagePolicies && authzFleetReadAgentPolicies) {
    const logger = appContextService.getLogger().get('getAgentPoliciesHandler');
    await pMap(
      items,
      async (item) => {
        if (item.package_policies && item.package_policies.length > 0) {
          try {
            item.min_agent_version = await calculateMinAgentVersionForPolicy(
              item.package_policies,
              soClient
            );
          } catch (error) {
            // If calculation fails, log and continue without min_agent_version
            logger.warn(
              `Failed to calculate min_agent_version for agent policy ${item.id}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10 }
    );
  }

  if (!authzFleetReadAgentPolicies) {
    items = items.map(sanitizeItemForReadAgentOnly);
  } else if (withPackagePolicies && format === inputsFormat.Simplified) {
    items = items.map((item) => {
      if (isEmpty(item.package_policies)) {
        return item;
      }
      return {
        ...item,
        package_policies: item.package_policies!.map((packagePolicy) =>
          packagePolicyToSimplifiedPackagePolicy(packagePolicy)
        ),
      };
    }) as typeof items;
  }

  const body: GetAgentPoliciesResponse = {
    items,
    total,
    page,
    perPage,
  };
  return response.ok({ body });
};

export const bulkGetAgentPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof BulkGetAgentPoliciesRequestSchema.query>,
  TypeOf<typeof BulkGetAgentPoliciesRequestSchema.body>
> = async (context, request, response) => {
  try {
    const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
    const authzFleetReadAgentPolicies =
      request.authzResult?.[FLEET_API_PRIVILEGES.AGENT_POLICIES.READ] === true;
    const authzFleetAgentRead = request.authzResult?.[FLEET_API_PRIVILEGES.AGENTS.READ] === true;

    const soClient =
      authzFleetReadAgentPolicies || authzFleetAgentRead
        ? coreContext.savedObjects.client
        : fleetContext.internalSoClient;

    const { full: withPackagePolicies = false, ignoreMissing = false, ids } = request.body;
    if (!authzFleetReadAgentPolicies && withPackagePolicies) {
      throw new FleetUnauthorizedError(
        'full query parameter require agent policies read permissions'
      );
    }
    let items = await agentPolicyService.getByIds(soClient, ids, {
      withPackagePolicies,
      ignoreMissing,
    });

    // Calculate min_agent_version for all items with package policies (before format transformation)
    if (withPackagePolicies && authzFleetReadAgentPolicies) {
      const logger = appContextService.getLogger().get('bulkGetAgentPoliciesHandler');
      await pMap(
        items,
        async (item) => {
          if (item.package_policies && item.package_policies.length > 0) {
            try {
              item.min_agent_version = await calculateMinAgentVersionForPolicy(
                item.package_policies,
                soClient
              );
            } catch (error) {
              // If calculation fails, log and continue without min_agent_version
              logger.warn(
                `Failed to calculate min_agent_version for agent policy ${item.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }
        },
        { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10 }
      );
    }

    if (!authzFleetReadAgentPolicies) {
      items = items.map(sanitizeItemForReadAgentOnly);
    } else if (withPackagePolicies && request.query.format === inputsFormat.Simplified) {
      items = items.map((item) => {
        if (isEmpty(item.package_policies)) {
          return item;
        }
        return {
          ...item,
          package_policies: item.package_policies!.map((packagePolicy) =>
            packagePolicyToSimplifiedPackagePolicy(packagePolicy)
          ),
        };
      }) as typeof items;
    }

    const body: BulkGetAgentPoliciesResponse = {
      items,
    };
    if (authzFleetAgentRead) {
      await populateAssignedAgentsCount(fleetContext.agentClient.asCurrentUser, items);
    }

    return response.ok({ body });
  } catch (error) {
    if (error instanceof AgentPolicyNotFoundError) {
      return response.notFound({
        body: {
          message: error.message,
        },
      });
    }

    throw error;
  }
};

export const getOneAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetOneAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetOneAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  try {
    const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
    const soClient = coreContext.savedObjects.client;

    const agentPolicy = await agentPolicyService.get(soClient, request.params.agentPolicyId, true);
    if (agentPolicy) {
      if (fleetContext.authz.fleet.readAgents) {
        await populateAssignedAgentsCount(fleetContext.agentClient.asCurrentUser, [agentPolicy]);
      }
      let item: any = agentPolicy;
      if (!fleetContext.authz.fleet.readAgentPolicies) {
        item = sanitizeItemForReadAgentOnly(agentPolicy);
      } else if (
        request.query.format === inputsFormat.Simplified &&
        !isEmpty(agentPolicy.package_policies)
      ) {
        item = {
          ...agentPolicy,
          package_policies: agentPolicy.package_policies!.map((packagePolicy) =>
            packagePolicyToSimplifiedPackagePolicy(packagePolicy)
          ),
        };
      }

      // Calculate min_agent_version if package policies are available and user has read permissions
      if (
        fleetContext.authz.fleet.readAgentPolicies &&
        agentPolicy.package_policies &&
        agentPolicy.package_policies.length > 0
      ) {
        try {
          item.min_agent_version = await calculateMinAgentVersionForPolicy(
            agentPolicy.package_policies,
            soClient
          );
        } catch (error) {
          // If calculation fails, log and continue without min_agent_version
          const logger = appContextService.getLogger().get('getOneAgentPolicyHandler');
          logger.warn(
            `Failed to calculate min_agent_version for agent policy ${
              request.params.agentPolicyId
            }: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const body: GetOneAgentPolicyResponse = {
        item,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent policy not found' },
      });
    }
  } catch (error) {
    const logger = appContextService.getLogger().get('getOneAgentPolicyHandler');
    logger.error(
      `Error in getOneAgentPolicyHandler for agent policy ${request.params.agentPolicyId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
};

export const getAutoUpgradeAgentsStatusHandler: FleetRequestHandler<
  TypeOf<typeof GetAutoUpgradeAgentsStatusRequestSchema.params>,
  undefined
> = async (context, request, response) => {
  const [_, fleetContext] = await Promise.all([context.core, context.fleet]);

  const agentClient = fleetContext.agentClient.asCurrentUser;

  if (!licenseService.isEnterprise()) {
    throw new FleetUnauthorizedError(
      'Auto-upgrade agents feature requires at least Enterprise license'
    );
  }

  const body = await getAutoUpgradeAgentsStatus(agentClient, request.params.agentPolicyId);
  return response.ok({
    body,
  });
};

export const createAgentPolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const withSysMonitoring = request.query.sys_monitoring ?? false;
  const monitoringEnabled = request.body.monitoring_enabled;
  const logger = appContextService.getLogger().get('httpCreateAgentPolicyHandler');

  const { has_fleet_server: hasFleetServer, force, ...newPolicy } = request.body;
  const spaceId = fleetContext.spaceId;
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);
  const { space_ids: spaceIds } = request.body;

  logger.debug(`Creating agent policy [${newPolicy.name}]`);

  try {
    let authorizedSpaces: string[] | undefined;
    if (spaceIds?.length) {
      logger.debug(`Checking privileges for spaces [${spaceIds.join(', ')}] `);

      authorizedSpaces = await getAuthorizedSpacesWithAgentPoliciesAllPrivileges(request, context);
      for (const requestedSpaceId of spaceIds) {
        if (!authorizedSpaces.includes(requestedSpaceId)) {
          throw new FleetError(
            `No enough permissions to create policies in space ${requestedSpaceId}`
          );
        }
      }
    }

    const agentPolicy = await createAgentPolicyWithPackages({
      soClient,
      esClient,
      agentPolicyService,
      newPolicy,
      hasFleetServer,
      withSysMonitoring,
      monitoringEnabled,
      spaceId,
      user,
      authorizationHeader,
      force,
    });

    const body: CreateAgentPolicyResponse = {
      item: agentPolicy,
    };
    // Update spaces if there is more than one space ID assigned to that policy or if there the space that policy is created is different than the current space
    if (
      spaceIds &&
      authorizedSpaces &&
      (spaceIds.length > 1 || (spaceIds.length === 0 && spaceIds[0]) !== spaceId)
    ) {
      await updateAgentPolicySpaces({
        agentPolicy: {
          ...agentPolicy,
          space_ids: spaceIds,
        },
        currentSpaceId: spaceId,
        authorizedSpaces,
        options: { force },
      });
    }

    return response.ok({
      body,
    });
  } catch (error) {
    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    throw error;
  }
};

export const createAgentAndPackagePoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreateAgentAndPackagePolicyRequestSchema.query>,
  TypeOf<typeof CreateAgentAndPackagePolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const logger = appContextService.getLogger().get('httpCreateAgentAndPackagePoliciesHandler');
  logger.debug('Creating agent and package policies');

  // Try to create the agent policy
  const { package_policies: packagePolicies, ...agentPolicyWithoutPackagePolicies } = request.body;
  const agentPolicyRequest = {
    ...request,
    body: agentPolicyWithoutPackagePolicies,
    query: request.query satisfies CreateAgentPolicyRequest['query'],
  };
  const agentPolicyResult = await createAgentPolicyHandler(context, agentPolicyRequest, response);
  const createdAgentPolicy: CreateAgentPolicyResponse['item'] = agentPolicyResult.options.body.item;
  const createdPackagePolicyIds = [];

  if (agentPolicyRequest.body.id && agentPolicyRequest.body.id !== createdAgentPolicy.id) {
    logger.warn(
      `Agent policy created with id ${createdAgentPolicy.id} instead of requested id ${agentPolicyRequest.body.id}`
    );
  }

  // Try to create the package policies
  try {
    for (const packagePolicy of packagePolicies) {
      // Extract the original agent policy ID from the request in order to replace it with the created agent policy ID
      const {
        policy_id: agentPolicyId,
        policy_ids: agentPolicyIds,
        ...restOfPackagePolicy
      } = packagePolicy;

      // Warn if the requested agent policy ID does not match the created agent policy ID
      if (agentPolicyId && agentPolicyId !== createdAgentPolicy.id) {
        logger.warn(
          `Creating package policy with agent policy ID ${createdAgentPolicy.id} instead of requested id ${agentPolicyId}`
        );
      }
      if (
        agentPolicyIds &&
        agentPolicyIds.length > 0 &&
        (!agentPolicyIds.includes(createdAgentPolicy.id) || agentPolicyIds.length > 1)
      ) {
        logger.warn(
          `Creating package policy with agent policy ID ${
            createdAgentPolicy.id
          } instead of requested id(s) ${agentPolicyIds.join(',')}`
        );
      }

      const packagePolicyRequest = {
        ...request,
        body: {
          ...restOfPackagePolicy,
          policy_ids: [createdAgentPolicy.id],
        },
        query: request.query satisfies CreatePackagePolicyRequest['query'],
      };
      const packagePolicyResult = await createPackagePolicyHandler(
        context,
        packagePolicyRequest,
        response
      );
      createdPackagePolicyIds.push(packagePolicyResult.options.body.item.id);
    }

    // Return the created agent policy with full package policy details
    return getOneAgentPolicyHandler(
      context,
      {
        ...request,
        body: {},
        params: { agentPolicyId: createdAgentPolicy.id },
      },
      response
    );
  } catch (e) {
    // If there is an error creating package policies, delete any created package policy
    // and the parent agent policy
    if (createdPackagePolicyIds.length > 0) {
      await packagePolicyService.delete(
        coreContext.savedObjects.client,
        coreContext.elasticsearch.client.asInternalUser,
        createdPackagePolicyIds,
        {
          force: true,
          skipUnassignFromAgentPolicies: true,
        }
      );
    }
    if (createdAgentPolicy) {
      await agentPolicyService.delete(
        coreContext.savedObjects.client,
        coreContext.elasticsearch.client.asInternalUser,
        createdAgentPolicy.id,
        {
          force: true,
        }
      );
    }

    // Rethrow
    throw e;
  }
};

export const updateAgentPolicyHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAgentPolicyRequestSchema.params>,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.query>,
  TypeOf<typeof UpdateAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const logger = appContextService.getLogger().get('httpUpdateAgentPolicyHandler');
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const { force, bumpRevision, ...data } = request.body;

  const spaceIds = data.space_ids;
  let spaceId = fleetContext.spaceId;

  logger.debug(`updating policy [${request.params.agentPolicyId}] in space [${spaceId}]`);

  try {
    const authzFleetAgentsAll = fleetContext.authz.fleet.allAgents;

    const requestSpaceId = spaceId;

    if (spaceIds?.length) {
      const authorizedSpaces = await getAuthorizedSpacesWithAgentPoliciesAllPrivileges(
        request,
        context
      );
      await updateAgentPolicySpaces({
        agentPolicy: { ...data, id: request.params.agentPolicyId },
        currentSpaceId: spaceId,
        authorizedSpaces,
        options: { force },
      });

      spaceId = spaceIds[0];

      logger.debug(
        `spaceId now set to [${spaceId}] for updating agent policy [${request.params.agentPolicyId}]`
      );
    }
    const agentPolicy = await agentPolicyService.update(
      appContextService.getInternalUserSOClientForSpaceId(spaceId),
      esClient,
      request.params.agentPolicyId,
      data,
      {
        force,
        bumpRevision,
        user,
        spaceId,
        requestSpaceId,
        isRequiredVersionsAuthorized: authzFleetAgentsAll,
      }
    );

    let item: any = agentPolicy;
    if (
      request.query.format === inputsFormat.Simplified &&
      !isEmpty(agentPolicy.package_policies)
    ) {
      item = {
        ...agentPolicy,
        package_policies: agentPolicy.package_policies!.map((packagePolicy) =>
          packagePolicyToSimplifiedPackagePolicy(packagePolicy)
        ),
      };
    }

    const body: UpdateAgentPolicyResponse = { item };
    return response.ok({
      body,
    });
  } catch (error) {
    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }
    throw error;
  }
};

export const copyAgentPolicyHandler: RequestHandler<
  TypeOf<typeof CopyAgentPolicyRequestSchema.params>,
  TypeOf<typeof CopyAgentPolicyRequestSchema.query>,
  TypeOf<typeof CopyAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  try {
    const agentPolicy = await agentPolicyService.copy(
      soClient,
      esClient,
      request.params.agentPolicyId,
      request.body,
      { user }
    );

    let item: any = agentPolicy;
    if (
      request.query.format === inputsFormat.Simplified &&
      !isEmpty(agentPolicy.package_policies)
    ) {
      item = {
        ...agentPolicy,
        package_policies: agentPolicy.package_policies!.map((packagePolicy) =>
          packagePolicyToSimplifiedPackagePolicy(packagePolicy)
        ),
      };
    }

    const body: CopyAgentPolicyResponse = { item };
    return response.ok({
      body,
    });
  } catch (error) {
    throw error;
  }
};

export const deleteAgentPoliciesHandler: RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof DeleteAgentPolicyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;

  const body: DeleteAgentPolicyResponse = await agentPolicyService.delete(
    soClient,
    esClient,
    request.body.agentPolicyId,
    { user, force: request.body.force }
  );
  return response.ok({
    body,
  });
};

export const getFullAgentPolicy: FleetRequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;

  if (request.query.kubernetes === true) {
    const agentVersion =
      await fleetContext.agentClient.asInternalUser.getLatestAgentAvailableDockerImageVersion();
    const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
      soClient,
      request.params.agentPolicyId,
      agentVersion,
      { standalone: request.query.standalone === true }
    );
    if (fullAgentConfigMap) {
      const body: GetFullAgentConfigMapResponse = {
        item: fullAgentConfigMap,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent config map not found' },
      });
    }
  } else {
    const fullAgentPolicy = await agentPolicyService.getFullAgentPolicy(
      soClient,
      request.params.agentPolicyId,
      {
        standalone: request.query.standalone === true,
      }
    );
    if (fullAgentPolicy) {
      const body: GetFullAgentPolicyResponse = {
        item: fullAgentPolicy,
      };
      return response.ok({
        body,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent policy not found' },
      });
    }
  }
};

export const downloadFullAgentPolicy: FleetRequestHandler<
  TypeOf<typeof GetFullAgentPolicyRequestSchema.params>,
  TypeOf<typeof GetFullAgentPolicyRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const soClient = fleetContext.internalSoClient;
  const {
    params: { agentPolicyId },
  } = request;

  if (request.query.kubernetes === true) {
    const agentVersion =
      await fleetContext.agentClient.asInternalUser.getLatestAgentAvailableDockerImageVersion();
    const fullAgentConfigMap = await agentPolicyService.getFullAgentConfigMap(
      soClient,
      request.params.agentPolicyId,
      agentVersion,
      { standalone: request.query.standalone === true }
    );
    if (fullAgentConfigMap) {
      const body = fullAgentConfigMap;
      const headers: ResponseHeaders = {
        'content-type': 'text/x-yaml',
        'content-disposition': `attachment; filename="elastic-agent-standalone-kubernetes.yml"`,
      };
      return response.ok({
        body,
        headers,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent config map not found' },
      });
    }
  } else {
    const fullAgentPolicy = await agentPolicyService.getFullAgentPolicy(soClient, agentPolicyId, {
      standalone: request.query.standalone === true,
    });
    if (fullAgentPolicy) {
      const body = fullAgentPolicyToYaml(fullAgentPolicy, dump);
      const headers: ResponseHeaders = {
        'content-type': 'text/x-yaml',
        'content-disposition': `attachment; filename="elastic-agent.yml"`,
      };
      return response.ok({
        body,
        headers,
      });
    } else {
      return response.customError({
        statusCode: 404,
        body: { message: 'Agent policy not found' },
      });
    }
  }
};

export const getK8sManifest: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetK8sManifestRequestSchema.query>
> = async (context, request, response) => {
  const fleetServer = request.query.fleetServer ?? '';
  const token = request.query.enrolToken ?? '';

  const agentVersion = await getLatestAgentAvailableDockerImageVersion();

  const fullAgentManifest = await agentPolicyService.getFullAgentManifest(
    fleetServer,
    token,
    agentVersion
  );
  if (fullAgentManifest) {
    const body: GetFullAgentManifestResponse = {
      item: fullAgentManifest,
    };
    return response.ok({
      body,
    });
  } else {
    return response.customError({
      statusCode: 404,
      body: { message: 'Agent manifest not found' },
    });
  }
};

export const downloadK8sManifest: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetK8sManifestRequestSchema.query>
> = async (context, request, response) => {
  const fleetServer = request.query.fleetServer ?? '';
  const token = request.query.enrolToken ?? '';
  const agentVersion = await getLatestAgentAvailableDockerImageVersion();
  const fullAgentManifest = await agentPolicyService.getFullAgentManifest(
    fleetServer,
    token,
    agentVersion
  );
  if (fullAgentManifest) {
    const body = fullAgentManifest;
    const headers: ResponseHeaders = {
      'content-type': 'text/x-yaml',
      'content-disposition': `attachment; filename="elastic-agent-managed-kubernetes.yml"`,
    };
    return response.ok({
      body,
      headers,
    });
  } else {
    return response.customError({
      statusCode: 404,
      body: { message: 'Agent manifest not found' },
    });
  }
};

export const GetAgentPolicyOutputsHandler: FleetRequestHandler<
  TypeOf<typeof GetAgentPolicyOutputsRequestSchema.params>,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const agentPolicy = await agentPolicyService.get(soClient, request.params.agentPolicyId);

  if (!agentPolicy) {
    return response.customError({
      statusCode: 404,
      body: { message: 'Agent policy not found' },
    });
  }
  const outputs = await agentPolicyService.getAllOutputsForPolicy(agentPolicy);

  const body: GetAgentPolicyOutputsResponse = {
    item: outputs,
  };
  return response.ok({
    body,
  });
};

export const GetListAgentPolicyOutputsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof GetListAgentPolicyOutputsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const { ids } = request.body;

  if (!ids) {
    return response.ok({
      body: { items: [] },
    });
  }
  const agentPolicies = await agentPolicyService.getByIds(soClient, ids, {
    withPackagePolicies: true,
  });

  const outputsList = await agentPolicyService.listAllOutputsForPolicies(agentPolicies);

  const body: GetListAgentPolicyOutputsResponse = {
    items: outputsList,
  };

  return response.ok({
    body,
  });
};
