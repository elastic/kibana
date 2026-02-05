/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import { Streams, isIlmLifecycle, type IlmPolicyWithUsage } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { ilmPhases } from '../../../../lib/streams/lifecycle/ilm_phases';
import { getEffectiveLifecycle } from '../../../../lib/streams/lifecycle/get_effective_lifecycle';
import {
  buildPolicyUsage,
  normalizeIlmPhases,
  denormalizeIlmPhases,
  type IlmPoliciesResponse,
} from '../../../../lib/streams/lifecycle/ilm_policies';
import { StatusError } from '../../../../lib/streams/errors/status_error';

const lifecycleStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_stats',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    const definition = await streamsClient.getStream(name);
    if (!Streams.ingest.all.Definition.is(definition)) {
      throw new StatusError('Lifecycle stats are only available for ingest streams', 400);
    }

    const dataStream = await streamsClient.getDataStream(name);
    const lifecycle = await getEffectiveLifecycle({ definition, streamsClient, dataStream });
    if (!isIlmLifecycle(lifecycle)) {
      throw new StatusError('Lifecycle stats are only available for ILM policy', 400);
    }

    const { policy } = await scopedClusterClient.asCurrentUser.ilm
      .getLifecycle({ name: lifecycle.ilm.policy })
      .then((policies) => policies[lifecycle.ilm.policy]);

    const [{ indices: indicesIlmDetails }, { indices: indicesStats = {} }] = await Promise.all([
      scopedClusterClient.asCurrentUser.ilm.explainLifecycle({ index: name }),
      scopedClusterClient.asCurrentUser.indices.stats({ index: dataStream.name }),
    ]);

    return { phases: ilmPhases({ policy, indicesIlmDetails, indicesStats }) };
  },
});

const lifecycleIlmExplainRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_explain',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    // verifies read privileges
    await streamsClient.getStream(name);

    return scopedClusterClient.asCurrentUser.ilm.explainLifecycle({
      index: name,
    });
  },
});

const lifecycleIlmPoliciesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/lifecycle/policies',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients }): Promise<IlmPolicyWithUsage[]> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const policiesResponse =
      (await scopedClusterClient.asCurrentUser.ilm.getLifecycle()) as IlmPoliciesResponse;
    return Object.entries(policiesResponse).map(([policyName, policyEntry]) => {
      const { in_use_by } = buildPolicyUsage(policyEntry);
      return {
        name: policyName,
        phases: normalizeIlmPhases(policyEntry.policy?.phases),
        _meta: policyEntry.policy?._meta,
        deprecated: policyEntry.policy?.deprecated,
        in_use_by,
      };
    });
  },
});

const ilmPhaseSchema = z
  .object({
    min_age: z.string().optional(),
    actions: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

const lifecycleIlmPoliciesUpdateRoute = createServerRoute({
  endpoint: 'POST /internal/streams/lifecycle/policy',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      name: z.string(),
      phases: z.object({
        hot: ilmPhaseSchema.optional(),
        warm: ilmPhaseSchema.optional(),
        cold: ilmPhaseSchema.optional(),
        frozen: ilmPhaseSchema.optional(),
        delete: ilmPhaseSchema.optional(),
      }),
      _meta: z.record(z.string(), z.any()).optional(),
      deprecated: z.boolean().optional(),
      allowOverwrite: z.boolean().optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const { name, allowOverwrite = false, ...policy } = params.body;
    let existingPolicy:
      | {
          policy?: {
            phases?: {
              hot?: unknown;
            };
            _meta?: Record<string, unknown>;
            deprecated?: boolean;
          };
        }
      | undefined;
    try {
      existingPolicy = await scopedClusterClient.asCurrentUser.ilm
        .getLifecycle({ name })
        .then((policies) => policies[name]);
    } catch (error) {
      // Only throw if it's not a 404, since it's expected if the policy doesn't exist
      if (!(error instanceof errors.ResponseError) || error.statusCode !== 404) {
        throw error;
      }
    }
    if (existingPolicy && !allowOverwrite) {
      throw new StatusError('ILM policy already exists', 409);
    }
    const existingHasHot = Boolean(existingPolicy?.policy?.phases?.hot);
    const hasExistingPolicy = Boolean(existingPolicy);
    const incomingHasHot =
      Object.prototype.hasOwnProperty.call(policy.phases, 'hot') && policy.phases.hot != null;
    if ((!hasExistingPolicy || existingHasHot) && !incomingHasHot) {
      throw new StatusError(
        'Hot phase is required unless the existing policy already lacked it',
        400
      );
    }
    const basePolicy = existingPolicy?.policy ?? {};
    const phases = denormalizeIlmPhases(policy.phases as IlmPolicyPhases);
    const mergedPolicy = {
      ...basePolicy,
      ...policy,
      phases,
      _meta: policy._meta ?? basePolicy._meta,
      deprecated: policy.deprecated ?? basePolicy.deprecated,
    };
    await scopedClusterClient.asCurrentUser.ilm.putLifecycle({ name, policy: mergedPolicy });
    return {};
  },
});

export const internalLifecycleRoutes = {
  ...lifecycleStatsRoute,
  ...lifecycleIlmExplainRoute,
  ...lifecycleIlmPoliciesRoute,
  ...lifecycleIlmPoliciesUpdateRoute,
};
