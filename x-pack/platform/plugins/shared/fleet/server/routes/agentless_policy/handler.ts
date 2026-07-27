/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import pMap from 'p-map';
import { uniq } from 'lodash';

import type { CreateAgentlessPolicyRequestSchema } from '../../../common/types';
import { appContextService, packagePolicyService } from '../../services';
import type { FleetRequestHandler, ListAgentlessPoliciesRequestSchema } from '../../types';
import { AgentlessPoliciesServiceImpl } from '../../services/agentless/agentless_policies';
import type {
  AgentlessPolicyUpgradeDryRunRequestSchema,
  BulkUpgradeAgentlessPoliciesRequestSchema,
  DeleteAgentlessPolicyRequestSchema,
  GetBulkAgentlessPolicyThroughputRequestSchema,
  GetAgentlessPolicyRequestSchema,
  UpdateAgentlessPolicyRequestSchema,
} from '../../../common/types/rest_spec/agentless_policy';
import { syncAgentlessDeployments } from '../../services/agentless/deployment_sync';
import { agentlessAgentService } from '../../services/agents/agentless_agent';
import { getPolicyThroughput } from '../../services/agentless/throughput';

// Each per-policy search runs a nested date_histogram aggregation; cap it
// to avoid overwhelming the cluster when a page has many agentless policies.
const BULK_THROUGHPUT_CONCURRENCY = 10;

export const syncAgentlessPoliciesHandler: FleetRequestHandler<
  undefined,
  undefined,
  { dryRun?: boolean }
> = async (context, request, response) => {
  const logger = appContextService.getLogger().get('agentless');

  await syncAgentlessDeployments(
    {
      logger,
      agentlessAgentService,
    },
    {
      dryRun: request.body?.dryRun,
    }
  );

  return response.ok({
    body: {
      success: true,
    },
  });
};

export const createAgentlessPolicyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  const agentlessPolicy = await agentlessPoliciesService.createAgentlessPolicy(
    request.body,
    context,
    request
  );

  return response.ok({
    body: {
      item: agentlessPolicy,
    },
  });
};

export const updateAgentlessPolicyHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAgentlessPolicyRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAgentlessPolicyRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  // The service throws FleetNotFoundError when the policy is missing or not agentless,
  // which Fleet's global error handler maps to a 404 (a package name change throws
  // PackagePolicyRequestError → 400). No explicit branching needed here.
  const item = await agentlessPoliciesService.updateAgentlessPolicy(
    request.params.policyId,
    request.body,
    request
  );

  return response.ok({
    body: {
      item,
    },
  });
};

export const bulkUpgradeAgentlessPoliciesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUpgradeAgentlessPoliciesRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  const policyIds = uniq(request.body.policyIds);
  const body = await agentlessPoliciesService.bulkUpgradeAgentlessPolicies(policyIds, request);

  // Unlike the package-policy bulk upgrade handler, we deliberately do NOT promote the first
  // per-policy fatal error to a top-level HTTP status. The batch always returns 200 with the
  // full per-policy array, so a caller sees every outcome — which ids upgraded and which
  // failed (with their per-item `success: false` / `statusCode` / `body`) — instead of a
  // single top-level error that would hide a partially-successful batch.
  return response.ok({ body });
};

export const upgradeAgentlessPoliciesDryRunHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof AgentlessPolicyUpgradeDryRunRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  const policyIds = uniq(request.body.policyIds);
  const body = await agentlessPoliciesService.getAgentlessPolicyUpgradeDryRunDiff(
    policyIds,
    request.body.pkgVersion
  );

  // Unlike the package-policy dry-run handler, we deliberately do NOT promote a per-policy
  // hard failure (guard 404 or fatal dry-run error) to a top-level HTTP status. The batch
  // always returns 200 with the full per-policy array, so a caller sees every preview
  // alongside any per-item failures (`statusCode` / `body`) and soft migration errors
  // (`errors`).
  return response.ok({ body });
};

export const getAgentlessPolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetAgentlessPolicyRequestSchema.params>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  const { policyId } = request.params;
  const item = await agentlessPoliciesService.getAgentlessPolicy(policyId);

  if (!item) {
    return response.notFound({
      body: { message: `Agentless policy ${policyId} not found` },
    });
  }

  return response.ok({
    body: {
      item,
    },
  });
};

export const listAgentlessPoliciesHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof ListAgentlessPoliciesRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  const { items, total, page, perPage } = await agentlessPoliciesService.listAgentlessPolicies(
    request.query
  );

  return response.ok({
    body: {
      items,
      total,
      page,
      perPage,
    },
  });
};

export const deleteAgentlessPolicyHandler: FleetRequestHandler<
  TypeOf<typeof DeleteAgentlessPolicyRequestSchema.params>,
  TypeOf<typeof DeleteAgentlessPolicyRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const logger = appContextService.getLogger().get('agentless');

  const agentlessPoliciesService = new AgentlessPoliciesServiceImpl(
    fleetContext.packagePolicyService.asCurrentUser,
    soClient,
    esClient,
    logger
  );

  await agentlessPoliciesService.deleteAgentlessPolicy(
    request.params.policyId,
    { force: request.query.force },
    context,
    request
  );

  return response.ok({
    body: {
      id: request.params.policyId,
    },
  });
};

export const getBulkAgentlessPolicyThroughputHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof GetBulkAgentlessPolicyThroughputRequestSchema.body>
> = async (context, request, response) => {
  const { policyIds } = request.body;
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asCurrentUser;

  const packagePolicies = await packagePolicyService.getByIDs(soClient, policyIds, {
    ignoreMissing: true,
  });

  const items = await pMap(
    packagePolicies,
    async (packagePolicy) => {
      try {
        const throughput = await getPolicyThroughput(esClient, packagePolicy);
        return { policyId: packagePolicy.id, ...throughput };
      } catch {
        return { policyId: packagePolicy.id, averagePerSecond: 0, series: [] };
      }
    },
    { concurrency: BULK_THROUGHPUT_CONCURRENCY }
  );

  return response.ok({ body: { items } });
};
