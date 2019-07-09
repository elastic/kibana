/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { wrapCustomError } from '../../../../../server/lib/create_router/error_wrappers';
import { SlmPolicyEs, SlmPolicy } from '../../../common/types';
import { deserializePolicy } from '../../lib';

export function registerPolicyRoutes(router: Router) {
  router.get('policies', getAllHandler);
  router.get('policy/{name}', getOneHandler);
}

export const getAllHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  policies: SlmPolicy[];
}> => {
  // Get policies
  const policiesByName: {
    [key: string]: SlmPolicyEs;
  } = await callWithRequest('slm.policies');

  // Deserialize policies
  return {
    policies: Object.entries(policiesByName).map(([name, policy]) =>
      deserializePolicy(name, policy)
    ),
  };
};

export const getOneHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  policy: SlmPolicy;
}> => {
  // Get policy
  const { name } = req.params;
  const policiesByName: {
    [key: string]: SlmPolicyEs;
  } = await callWithRequest('slm.policy', {
    name,
  });

  if (!policiesByName[name]) {
    // If policy doesn't exist, ES will return 200 with an empty object, so manually throw 404 here
    throw wrapCustomError(new Error('Policy not found'), 404);
  }

  // Deserialize policy
  return {
    policy: deserializePolicy(name, policiesByName[name]),
  };
};
