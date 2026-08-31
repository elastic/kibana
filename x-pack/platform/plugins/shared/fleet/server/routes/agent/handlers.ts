/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, uniq } from 'lodash';
import { type RequestHandler, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { Script } from '@elastic/elasticsearch/lib/api/types';

import type {
  GetAgentsResponse,
  GetOneAgentResponse,
  GetAgentStatusResponse,
  GetAgentTagsResponse,
  GetAvailableVersionsResponse,
  GetActionStatusResponse,
  GetAgentUploadsResponse,
  PostAgentReassignResponse,
  PostRetrieveAgentsByActionsResponse,
  Agent,
} from '../../../common/types';
import type {
  GetAgentsRequestSchema,
  GetTagsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetAgentStatusRequestSchema,
  GetAgentDataRequestSchema,
  PostAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  GetActionStatusRequestSchema,
  GetAgentUploadFileRequestSchema,
  DeleteAgentUploadFileRequestSchema,
  PostRetrieveAgentsByActionsRequestSchema,
  FleetRequestHandler,
} from '../../types';
import { FleetNotFoundError } from '../../errors';
import * as AgentService from '../../services/agents';
import { fetchAndAssignAgentMetrics } from '../../services/agents/agent_metrics';
import { getAgentStatusForAgentPolicy } from '../../services/agents';
import { isAgentInNamespace } from '../../services/spaces/agent_namespaces';
import { getCurrentNamespace } from '../../services/spaces/get_current_namespace';
import { getPackageInfo } from '../../services/epm/packages';
import {
  generateTemplateIndexPattern,
  generateNamespaceTemplateIndexPattern,
} from '../../services/epm/elasticsearch/template/template';
import { isOtelDataStream } from '../../services/epm/packages/namespace_template_utils';
import { buildAgentStatusRuntimeField } from '../../services/agents/build_status_runtime_field';
import { appContextService, agentPolicyService } from '../../services';
import { AGENTS_INDEX } from '../../constants';
import type { AgentClient } from '../../services';
import type { RegistryDataStream } from '../../types';

async function verifyNamespace(agent: Agent, namespace?: string) {
  if (!(await isAgentInNamespace(agent, namespace))) {
    throw new FleetNotFoundError(`${agent.id} not found in namespace`);
  }
}

export const getAgentHandler: FleetRequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>,
  TypeOf<typeof GetOneAgentRequestSchema.query>
> = async (context, request, response) => {
  try {
    const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
    const esClientCurrentUser = coreContext.elasticsearch.client.asCurrentUser;

    let agent = await fleetContext.agentClient.asCurrentUser.getAgent(request.params.agentId);
    await verifyNamespace(agent, getCurrentNamespace(coreContext.savedObjects.client));

    if (request.query.withMetrics) {
      agent = (await fetchAndAssignAgentMetrics(esClientCurrentUser, [agent]))[0];
    }

    const body: GetOneAgentResponse = {
      item: agent,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    throw error;
  }
};

export const getAgentEffectiveConfigHandler: FleetRequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>,
  TypeOf<typeof GetOneAgentRequestSchema.query>
> = async (context, request, response) => {
  try {
    const [coreContext] = await Promise.all([context.core, context.fleet]);
    const esClient = appContextService.getInternalUserESClient();
    const agentDoc = await esClient.get({
      index: AGENTS_INDEX,
      id: request.params.agentId,
      _source: ['effective_config', 'namespaces'],
    });
    const agentSource = agentDoc._source as any;
    await verifyNamespace(
      {
        id: request.params.agentId,
        namespaces: agentSource.namespaces,
      } as Agent,
      getCurrentNamespace(coreContext.savedObjects.client)
    );
    return response.ok({ body: { effective_config: agentSource.effective_config } });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    throw error;
  }
};

export const deleteAgentHandler: FleetRequestHandler<
  TypeOf<typeof DeleteAgentRequestSchema.params>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    const agent = await fleetContext.agentClient.asCurrentUser.getAgent(request.params.agentId);
    await verifyNamespace(agent, getCurrentNamespace(coreContext.savedObjects.client));

    await AgentService.deleteAgent(esClient, request.params.agentId);

    const body = {
      action: 'deleted',
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom) {
      return response.customError({
        statusCode: error.output.statusCode,
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    throw error;
  }
};

export const updateAgentHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAgentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAgentRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const partialAgent: any = {};
  if (request.body.user_provided_metadata) {
    partialAgent.user_provided_metadata = request.body.user_provided_metadata;
  }
  if (request.body.tags) {
    partialAgent.tags = uniq(request.body.tags);
  }

  try {
    const agent = await fleetContext.agentClient.asCurrentUser.getAgent(request.params.agentId);
    await verifyNamespace(agent, getCurrentNamespace(soClient));

    await AgentService.updateAgent(esClient, request.params.agentId, partialAgent);
    const body = {
      item: await AgentService.getAgentById(esClient, soClient, request.params.agentId),
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    throw error;
  }
};

export const bulkUpdateAgentTagsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkUpdateAgentTagsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents, showInactive: request.body.includeInactive };

  const results = await AgentService.updateAgentTags(
    soClient,
    esClient,
    { ...agentOptions, batchSize: request.body.batchSize, dryRun: request.body.dryRun },
    request.body.tagsToAdd ?? [],
    request.body.tagsToRemove ?? []
  );

  if (request.body.dryRun) {
    return response.ok({ body: { count: (results as { count: number }).count } });
  }
  return response.ok({ body: { actionId: (results as { actionId: string }).actionId } });
};

export const getAgentsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentsRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const { agentClient } = fleetContext;
  const esClientCurrentUser = coreContext.elasticsearch.client.asCurrentUser;

  // Unwrap searchAfter from request query
  let searchAfter: any[] | undefined;
  if (request.query.searchAfter) {
    try {
      const searchAfterArray = JSON.parse(request.query.searchAfter);
      if (!Array.isArray(searchAfterArray) || searchAfterArray.length === 0) {
        response.badRequest({ body: { message: 'searchAfter must be a non-empty array' } });
      } else {
        searchAfter = searchAfterArray;
      }
    } catch (e) {
      response.badRequest({ body: { message: 'searchAfter must be a non-empty array' } });
    }
  }

  const agentRes = await agentClient.asCurrentUser.listAgents({
    page: request.query.page,
    perPage: request.query.perPage,
    showAgentless: request.query.showAgentless,
    showInactive: request.query.showInactive,
    showUpgradeable: request.query.showUpgradeable,
    kuery: request.query.kuery,
    sortField: request.query.sortField,
    sortOrder: request.query.sortOrder,
    searchAfter,
    openPit: request.query.openPit,
    pitId: request.query.pitId,
    pitKeepAlive: request.query.pitKeepAlive,
    getStatusSummary: request.query.getStatusSummary,
  });

  const { total, page, perPage, statusSummary, pit } = agentRes;
  let { agents } = agentRes;

  // Assign metrics
  if (request.query.withMetrics) {
    agents = await fetchAndAssignAgentMetrics(esClientCurrentUser, agents);
  }

  // Retrieve last agent to use for nextSearchAfter
  const lastAgent = agents.length > 0 ? agents[agents.length - 1] : undefined;

  const body: GetAgentsResponse = {
    items: agents,
    total,
    page,
    perPage,
    ...(lastAgent && lastAgent.sort ? { nextSearchAfter: JSON.stringify(lastAgent.sort) } : {}),
    ...(pit ? { pit } : {}),
    ...(statusSummary ? { statusSummary } : {}),
  };
  return response.ok({ body });
};

export const getAgentTagsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetTagsRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const tags = await AgentService.getAgentTags(soClient, esClient, {
    showInactive: request.query.showInactive,
    kuery: request.query.kuery,
    spaceId: getCurrentNamespace(soClient),
  });

  const body: GetAgentTagsResponse = {
    items: tags,
  };
  return response.ok({ body });
};

export const postAgentReassignHandler: RequestHandler<
  TypeOf<typeof PostAgentReassignRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  await AgentService.reassignAgent(
    soClient,
    esClient,
    request.params.agentId,
    request.body.policy_id
  );

  const body: PostAgentReassignResponse = {};
  return response.ok({ body });
};

export const postBulkAgentReassignHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents, showInactive: request.body.includeInactive };

  const results = await AgentService.reassignAgents(
    soClient,
    esClient,
    { ...agentOptions, batchSize: request.body.batchSize, dryRun: request.body.dryRun },
    request.body.policy_id
  );

  if (request.body.dryRun) {
    return response.ok({ body: { count: (results as { count: number }).count } });
  }
  return response.ok({ body: { actionId: (results as { actionId: string }).actionId } });
};

export const getAgentStatusForAgentPolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentStatusRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = fleetContext.internalSoClient;

  const parsePolicyIds = (policyIds: string | string[] | undefined): string[] | undefined => {
    if (!policyIds || !policyIds.length) {
      return undefined;
    }

    return Array.isArray(policyIds) ? policyIds : [policyIds];
  };

  const results = await getAgentStatusForAgentPolicy(
    esClient,
    soClient,
    request.query.policyId,
    request.query.kuery,
    coreContext.savedObjects.client.getCurrentNamespace(),
    parsePolicyIds(request.query.policyIds)
  );

  const body: GetAgentStatusResponse = { results: omit(results, 'total') };

  return response.ok({ body });
};

/**
 * Resolves the namespace-scoped OTel pattern for the identity-free incoming-data path, or
 * undefined if any condition of the gate (agent, policy, namespace) does not hold. The pattern
 * is scoped to a single namespace, never a wildcard, since there is no `agent.id` left to
 * narrow the match once the identity filter is dropped.
 */
async function resolveAgentlessOtelDataStreamPattern({
  agentClient,
  soClient,
  agentId,
  pkgName,
  pkgVersion,
  otelDataStreams,
}: {
  agentClient: AgentClient;
  soClient: SavedObjectsClientContract;
  agentId: string;
  pkgName: string;
  pkgVersion: string;
  otelDataStreams: RegistryDataStream[];
}): Promise<string | undefined> {
  const [agent] = await agentClient.getByIds([agentId], { ignoreMissing: true });
  if (!agent?.policy_id) {
    return undefined;
  }

  const [agentPolicy] = await agentPolicyService.getByIds(soClient, [agent.policy_id], {
    withPackagePolicies: true,
    ignoreMissing: true,
  });
  if (!agentPolicy?.supports_agentless) {
    return undefined;
  }

  // Require exactly one attached package policy matching pkgName and pkgVersion; zero or more
  // than one (e.g. attached in multiple namespaces) is ambiguous, so fall back to the identity
  // path instead of guessing.
  const matchingPackagePolicies = (agentPolicy.package_policies ?? []).filter(
    (packagePolicy) =>
      packagePolicy.package?.name === pkgName && packagePolicy.package?.version === pkgVersion
  );
  if (matchingPackagePolicies.length !== 1) {
    return undefined;
  }
  const [matchingPackagePolicy] = matchingPackagePolicies;

  const namespace = matchingPackagePolicy.namespace || agentPolicy.namespace;
  if (!namespace) {
    return undefined;
  }

  return otelDataStreams
    .map((ds) => generateNamespaceTemplateIndexPattern(ds, namespace, true))
    .join(',');
}

export const getAgentDataHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentDataRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asCurrentUser;
  const agentsIds = isStringArray(request.query.agentsIds)
    ? request.query.agentsIds
    : [request.query.agentsIds];
  const { pkgName, pkgVersion, previewData: returnDataPreview } = request.query;

  // If a package is specified, get data stream patterns for that package
  // and scope incoming data query to that pattern
  let dataStreamPattern: string | undefined;
  let otelDataStreams: RegistryDataStream[] = [];
  let nonOtelDataStreams: RegistryDataStream[] = [];
  if (pkgName && pkgVersion) {
    const packageInfo = await getPackageInfo({
      savedObjectsClient: coreContext.savedObjects.client,
      prerelease: true,
      pkgName,
      pkgVersion,
    });
    // Input-only OTel packages declare no manifest data streams, so this falls through to the
    // identity path. Known gap: https://github.com/elastic/ingest-dev/issues/8988.
    const dataStreams = packageInfo.data_streams || [];
    otelDataStreams = dataStreams.filter((ds) => isOtelDataStream(ds, packageInfo));
    nonOtelDataStreams = dataStreams.filter((ds) => !isOtelDataStream(ds, packageInfo));
    dataStreamPattern =
      dataStreams
        .map((ds) => generateTemplateIndexPattern(ds, isOtelDataStream(ds, packageInfo)))
        .join(',') || undefined;

    // Native OTel data has no queryable agent identity, so only a single-agent, namespace-scoped
    // lookup can answer for it.
    if (otelDataStreams.length > 0 && agentsIds.length === 1) {
      const fleetContext = await context.fleet;
      // internalSoClient reads only policy metadata for the gate below; the route still requires
      // agents:read, and ES data is queried with asCurrentUser.
      const namespacedPattern = await resolveAgentlessOtelDataStreamPattern({
        agentClient: fleetContext.agentClient.asCurrentUser,
        soClient: fleetContext.internalSoClient,
        agentId: agentsIds[0],
        pkgName,
        pkgVersion,
        otelDataStreams,
      });

      if (namespacedPattern) {
        const identityFreeResult = await AgentService.getIncomingDataByDataStreams({
          esClient,
          agentId: agentsIds[0],
          dataStreamPattern: namespacedPattern,
          returnDataPreview,
        });

        // Combine with the identity path's answer so non-OTel streams in a mixed package
        // aren't silently ignored.
        if (nonOtelDataStreams.length === 0) {
          return response.ok({ body: identityFreeResult });
        }

        const nonOtelPattern = nonOtelDataStreams
          .map((ds) => generateTemplateIndexPattern(ds, false))
          .join(',');
        const identityResult = await AgentService.getIncomingDataByAgentsId({
          esClient,
          agentsIds,
          dataStreamPattern: nonOtelPattern,
          returnDataPreview,
        });

        return response.ok({
          body: combineIncomingDataResults(agentsIds[0], identityFreeResult, identityResult),
        });
      }
    }
  }

  const { items, dataPreview } = await AgentService.getIncomingDataByAgentsId({
    esClient,
    agentsIds,
    dataStreamPattern,
    returnDataPreview,
  });

  const body = { items, dataPreview };

  return response.ok({ body });
};

interface IncomingDataResult {
  items: Array<Record<string, { data: boolean }>>;
  dataPreview: unknown[];
}

/**
 * Combines the identity-free OTel answer with the identity-based answer for a mixed
 * package's non-OTel streams. Either source reporting data is enough to report data overall,
 * since a mixed package can deliver a healthy signal through only one of its stream groups.
 */
function combineIncomingDataResults(
  agentId: string,
  identityFreeResult: IncomingDataResult,
  identityResult: IncomingDataResult
): IncomingDataResult {
  const hasData =
    (identityFreeResult.items[0]?.[agentId]?.data ?? false) ||
    (identityResult.items[0]?.[agentId]?.data ?? false);

  return {
    items: [{ [agentId]: { data: hasData } }],
    dataPreview: [...identityFreeResult.dataPreview, ...identityResult.dataPreview].slice(
      0,
      AgentService.MAX_AGENT_DATA_PREVIEW_SIZE
    ),
  };
}

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

export const getAgentStatusRuntimeFieldHandler: RequestHandler = async (
  context,
  request,
  response
) => {
  const runtimeFields = await buildAgentStatusRuntimeField();

  return response.ok({ body: (runtimeFields.status.script as Script)!.source! });
};

export const getAvailableVersionsHandler: RequestHandler = async (context, request, response) => {
  const availableVersions = await AgentService.getAvailableVersions();
  const body: GetAvailableVersionsResponse = { items: availableVersions };

  return response.ok({ body });
};

export const getActionStatusHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetActionStatusRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const actionStatuses = await AgentService.getActionStatuses(
    esClient,
    request.query,
    getCurrentNamespace(coreContext.savedObjects.client)
  );
  const body: GetActionStatusResponse = { items: actionStatuses };
  return response.ok({ body });
};

export const postRetrieveAgentsByActionsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostRetrieveAgentsByActionsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const allAgentIds = await AgentService.getAgentsByActionsIds(esClient, request.body.actionIds);
  const agents = await AgentService.filterAgentIdsByNamespace(esClient, soClient, allAgentIds);
  const body: PostRetrieveAgentsByActionsResponse = { items: agents };
  return response.ok({ body });
};

export const getAgentUploadsHandler: RequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  await AgentService.getAgentById(esClient, soClient, request.params.agentId);

  const body: GetAgentUploadsResponse = {
    items: await AgentService.getAgentUploads(esClient, request.params.agentId),
  };

  return response.ok({ body });
};

export const getAgentUploadFileHandler: RequestHandler<
  TypeOf<typeof GetAgentUploadFileRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const agentId = await AgentService.getAgentIdForUploadFile(esClient, request.params.fileId);
  await AgentService.getAgentById(esClient, soClient, agentId);

  const resp = await AgentService.getAgentUploadFile(
    esClient,
    request.params.fileId,
    request.params.fileName
  );

  return response.ok(resp);
};

export const deleteAgentUploadFileHandler: RequestHandler<
  TypeOf<typeof DeleteAgentUploadFileRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const agentId = await AgentService.getAgentIdForUploadFile(esClient, request.params.fileId);
  await AgentService.getAgentById(esClient, soClient, agentId);

  const resp = await AgentService.deleteAgentUploadFile(esClient, request.params.fileId);

  return response.ok({ body: resp });
};
