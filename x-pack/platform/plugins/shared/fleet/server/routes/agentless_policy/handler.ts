/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { inputsFormat } from '../../../common/constants';
import type { CreateAgentlessPolicyRequestSchema } from '../../../common/types';
import { packagePolicyToSimplifiedPackagePolicy } from '../../../common/services/simplified_package_policy_helper';
import type { FleetRequestHandler } from '../../types';
import { appContextService, packagePolicyService } from '../../services';
import { AgentlessPoliciesServiceImpl } from '../../services/agentless/agentless_policies';
import type {
  DeleteAgentlessPolicyRequestSchema,
  GetAgentlessPolicyThroughputRequestSchema,
  GetAgentlessPolicyThroughputResponse,
} from '../../../common/types/rest_spec/agentless_policy';
import { syncAgentlessDeployments } from '../../services/agentless/deployment_sync';
import { agentlessAgentService } from '../../services/agents/agentless_agent';
import { dataStreamService } from '../../services/data_streams';
import { retryTransientEsErrors } from '../../services/epm/elasticsearch/retry';

const PEAK_WINDOW_SECONDS = 10;

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
  TypeOf<typeof CreateAgentlessPolicyRequestSchema.query>,
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

  const packagePolicy = await agentlessPoliciesService.createAgentlessPolicy(
    request.body,
    context,
    request
  );

  return response.ok({
    body: {
      item:
        request.query.format === inputsFormat.Simplified
          ? packagePolicyToSimplifiedPackagePolicy(packagePolicy)
          : packagePolicy,
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

export const getAgentlessPolicyThroughputHandler: FleetRequestHandler<
  TypeOf<typeof GetAgentlessPolicyThroughputRequestSchema.params>
> = async (context, request, response) => {
  const { policyId } = request.params;
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asCurrentUser;

  const packagePolicy = await packagePolicyService.get(soClient, policyId);
  if (!packagePolicy) {
    return response.notFound({ body: { message: `Package policy '${policyId}' not found` } });
  }

  // Derive unique index patterns from the package policy's data streams
  const indexPatterns = [
    ...new Set(
      packagePolicy.inputs.flatMap((input) =>
        input.streams
          .filter((stream) => stream.enabled)
          .map((stream) =>
            dataStreamService.streamPartsToIndexPattern({
              type: stream.data_stream.type ?? 'logs',
              dataset: stream.data_stream.dataset,
            })
          )
      )
    ),
  ];

  const emptyResult: GetAgentlessPolicyThroughputResponse = { averagePerSecond: 0, series: [] };

  if (indexPatterns.length === 0) {
    return response.ok({ body: emptyResult });
  }

  let searchResult;
  try {
    searchResult = await retryTransientEsErrors(() =>
      esClient.search({
        index: indexPatterns.join(','),
        size: 0,
        allow_no_indices: true,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { range: { 'event.ingested': { gte: 'now-24h', lte: 'now' } } },
              { wildcard: { 'agent.name': { value: `*${policyId}*` } } },
            ],
          },
        },
        aggs: {
          throughput: {
            date_histogram: {
              field: 'event.ingested',
              fixed_interval: '30m',
              min_doc_count: 0,
              extended_bounds: { min: 'now-24h', max: 'now' },
            },
            aggs: {
              per_window: {
                date_histogram: {
                  field: 'event.ingested',
                  fixed_interval: '10s',
                  min_doc_count: 1, // omit empty windows to keep inner bucket count low
                },
              },
              peak_per_window: {
                max_bucket: { buckets_path: 'per_window>_count' },
              },
            },
          },
        },
      })
    );
  } catch (err) {
    if (err?.statusCode === 404) {
      return response.ok({ body: emptyResult });
    }
    throw err;
  }

  interface ThroughputBucket {
    key: number;
    doc_count: number;
    peak_per_window?: { value: number | null };
  }
  const throughputAgg = searchResult.aggregations?.throughput as
    | { buckets: ThroughputBucket[] }
    | undefined;
  const buckets = throughputAgg?.buckets ?? [];

  let totalDocs = 0;
  const series = buckets.map(({ key, doc_count: docCount, peak_per_window: peak }) => {
    totalDocs += docCount;
    // peak docs in any 10s window within this hour, normalized to events/s
    return { x: key, y: (peak?.value ?? 0) / PEAK_WINDOW_SECONDS };
  });
  const averagePerSecond = totalDocs / (24 * 3600);

  return response.ok({ body: { averagePerSecond, series } });
};
