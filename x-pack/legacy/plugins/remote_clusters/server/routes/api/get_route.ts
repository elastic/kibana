/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { deserializeCluster } from '../../lib/cluster_serialization';

export const register = (router: Router): void => {
  router.get('', getAllHandler);
};

// GET '/api/remote_clusters'
export const getAllHandler: RouterRouteHandler = async (req, callWithRequest): Promise<any[]> => {
  const clusterSettings = await callWithRequest('cluster.getSettings');
  const transientClusterNames = Object.keys(get(clusterSettings, `transient.cluster.remote`) || {});
  const persistentClusterNames = Object.keys(
    get(clusterSettings, `persistent.cluster.remote`) || {}
  );

  const clustersByName = await callWithRequest('cluster.remoteInfo');
  const clusterNames = (clustersByName && Object.keys(clustersByName)) || [];

  return clusterNames.map(
    (clusterName: string): any => {
      const cluster = clustersByName[clusterName];
      const isTransient = transientClusterNames.includes(clusterName);
      const isPersistent = persistentClusterNames.includes(clusterName);
      // If the cluster hasn't been stored in the cluster state, then it's defined by the
      // node's config file.
      const isConfiguredByNode = !isTransient && !isPersistent;

      return {
        ...deserializeCluster(clusterName, cluster),
        isConfiguredByNode,
      };
    }
  );
};
