/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeAction } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createGETAgentsStatusRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/policy/{policyId}/agent-status',
  options: {
    tags: ['access:fleet-read'],
    validate: {},
  },
  handler: async (
    request: FrameworkRequest<{ params: { policyId: string } }>
  ): Promise<ReturnTypeAction> => {
    const result = await libs.agents.getAgentsStatusForPolicy(
      request.user,
      request.params.policyId
    );

    return { result, success: true };
  },
});
