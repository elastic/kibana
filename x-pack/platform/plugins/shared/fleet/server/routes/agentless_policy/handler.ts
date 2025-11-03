/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { packagePolicyToSimplifiedPackagePolicy } from '../../../common/services/simplified_package_policy_helper';
import type { FleetRequestHandler } from '../../types';
import type { CreateAgentlessPolicyRequestSchema } from '../../types/agentless_policy';
import { appContextService } from '../../services';
import { AgentlessPoliciesServiceImpl } from '../../services/agentless/agentless_policies';

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

  const packagePolicy = await agentlessPoliciesService.createAgentlessPolicy(
    request.body,
    context,
    request
  );

  return response.ok({
    body: {
      item: true // TODO request.query.format === inputsFormat.Simplified
        ? packagePolicyToSimplifiedPackagePolicy(packagePolicy)
        : packagePolicy,
    },
  });
};
