/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import {
  wrapCustomError,
  wrapEsError,
} from '../../../../../server/lib/create_router/error_wrappers';
import { SlmPolicyEs, SlmPolicy, SlmPolicyPayload } from '../../../common/types';
import { deserializePolicy, serializePolicy } from '../../../common/lib';
import { Plugins } from '../../shim';
import { getManagedPolicyNames } from '../../lib';

let callWithInternalUser: any;

export function registerPolicyRoutes(router: Router, plugins: Plugins) {
  callWithInternalUser = plugins.elasticsearch.getCluster('data').callWithInternalUser;
  router.get('policies', getAllHandler);
  router.get('policy/{name}', getOneHandler);
  router.post('policy/{name}/run', executeHandler);
  router.delete('policies/{names}', deleteHandler);
  router.put('policies', createHandler);
  router.put('policies/{name}', updateHandler);
  router.get('policies/indices', getIndicesHandler);
  router.get('policies/retention_settings', getRetentionSettingsHandler);
  router.put('policies/retention_settings', updateRetentionSettingsHandler);
  router.post('policies/retention', executeRetentionHandler);
}

export const getAllHandler: RouterRouteHandler = async (
  _req,
  callWithRequest
): Promise<{
  policies: SlmPolicy[];
}> => {
  const managedPolicies = await getManagedPolicyNames(callWithInternalUser);

  // Get policies
  const policiesByName: {
    [key: string]: SlmPolicyEs;
  } = await callWithRequest('sr.policies', {
    human: true,
  });

  // Deserialize policies
  return {
    policies: Object.entries(policiesByName).map(([name, policy]) => {
      return deserializePolicy(name, policy, managedPolicies);
    }),
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
  } = await callWithRequest('sr.policy', {
    name,
    human: true,
  });

  if (!policiesByName[name]) {
    // If policy doesn't exist, ES will return 200 with an empty object, so manually throw 404 here
    throw wrapCustomError(new Error('Policy not found'), 404);
  }

  const managedPolicies = await getManagedPolicyNames(callWithInternalUser);

  // Deserialize policy
  return {
    policy: deserializePolicy(name, policiesByName[name], managedPolicies),
  };
};

export const executeHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const { snapshot_name: snapshotName } = await callWithRequest('sr.executePolicy', {
    name,
  });
  return { snapshotName };
};

export const deleteHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { names } = req.params;
  const policyNames = names.split(',');
  const response: { itemsDeleted: string[]; errors: any[] } = {
    itemsDeleted: [],
    errors: [],
  };

  await Promise.all(
    policyNames.map(name => {
      return callWithRequest('sr.deletePolicy', { name })
        .then(() => response.itemsDeleted.push(name))
        .catch(e =>
          response.errors.push({
            name,
            error: wrapEsError(e),
          })
        );
    })
  );

  return response;
};

export const createHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const policy = req.payload as SlmPolicyPayload;
  const { name } = policy;
  const conflictError = wrapCustomError(
    new Error('There is already a policy with that name.'),
    409
  );

  // Check that policy with the same name doesn't already exist
  try {
    const policyByName = await callWithRequest('sr.policy', { name });
    if (policyByName[name]) {
      throw conflictError;
    }
  } catch (e) {
    // Rethrow conflict error but silently swallow all others
    if (e === conflictError) {
      throw e;
    }
  }

  // Otherwise create new policy
  return await callWithRequest('sr.updatePolicy', {
    name,
    body: serializePolicy(policy),
  });
};

export const updateHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const policy = req.payload as SlmPolicyPayload;

  // Check that policy with the given name exists
  // If it doesn't exist, 404 will be thrown by ES and will be returned
  await callWithRequest('sr.policy', { name });

  // Otherwise update policy
  return await callWithRequest('sr.updatePolicy', {
    name,
    body: serializePolicy(policy),
  });
};

export const getIndicesHandler: RouterRouteHandler = async (
  _req,
  callWithRequest
): Promise<{
  indices: string[];
}> => {
  // Get indices
  const indices: Array<{
    index: string;
  }> = await callWithRequest('cat.indices', {
    format: 'json',
    h: 'index',
  });

  return {
    indices: indices.map(({ index }) => index).sort(),
  };
};

export const getRetentionSettingsHandler: RouterRouteHandler = async (): Promise<
  | {
      [key: string]: string;
    }
  | undefined
> => {
  const { persistent, transient, defaults } = await callWithInternalUser('cluster.getSettings', {
    filterPath: '**.slm.retention*',
    includeDefaults: true,
  });
  const { slm: retentionSettings = undefined } = {
    ...defaults,
    ...persistent,
    ...transient,
  };

  const { retention_schedule: retentionSchedule } = retentionSettings;

  return { retentionSchedule };
};

export const updateRetentionSettingsHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { retentionSchedule } = req.payload as { retentionSchedule: string };

  return await callWithRequest('cluster.putSettings', {
    body: {
      persistent: {
        slm: {
          retention_schedule: retentionSchedule,
        },
      },
    },
  });
};

export const executeRetentionHandler: RouterRouteHandler = async (_req, callWithRequest) => {
  return await callWithRequest('sr.executeRetention');
};
