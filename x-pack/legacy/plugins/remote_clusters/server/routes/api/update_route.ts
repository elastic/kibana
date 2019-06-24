/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import {
  Router,
  RouterRouteHandler,
  wrapCustomError,
} from '../../../../../server/lib/create_router';
import { doesClusterExist } from '../../lib/does_cluster_exist';
import { serializeCluster, deserializeCluster } from '../../lib/cluster_serialization';

export const register = (router: Router): void => {
  router.put('/{name}', updateHandler);
};

export const updateHandler: RouterRouteHandler = async (req, callWithRequest): Promise<any> => {
  const { name } = req.params as any;
  const { seeds, skipUnavailable } = req.payload as any;

  // Check if cluster does exist.
  const existingCluster = await doesClusterExist(callWithRequest, name);
  if (!existingCluster) {
    throw wrapCustomError(new Error('There is no remote cluster with that name.'), 404);
  }

  // Delete existing cluster settings.
  // This is a workaround for: https://github.com/elastic/elasticsearch/issues/37799
  const deleteClusterPayload = serializeCluster({ name });
  await callWithRequest('cluster.putSettings', { body: deleteClusterPayload });

  // Update cluster as new settings
  const updateClusterPayload = serializeCluster({ name, seeds, skipUnavailable });
  const response = await callWithRequest('cluster.putSettings', { body: updateClusterPayload });
  const acknowledged = get(response, 'acknowledged');
  const cluster = get(response, `persistent.cluster.remote.${name}`);

  if (acknowledged && cluster) {
    return {
      ...deserializeCluster(name, cluster),
      isConfiguredByNode: false,
    };
  }

  // If for some reason the ES response did not acknowledge,
  // return an error. This shouldn't happen.
  throw wrapCustomError(new Error('Unable to update cluster, no response returned from ES.'), 400);
};
