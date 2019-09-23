/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../server/lib/create_router';
// import { wrapCustomError, wrapEsError } from '../../../../server/lib/create_router/error_wrappers';

// import { ClusterState } from '../../../common/types';

import { Plugins } from '../shim';

export function registerClusterRoutes(router: Router, plugins: Plugins) {
  // const callWithInternalUser = plugins.elasticsearch.getCluster('data').callWithInternalUser;

  const getClusterStateHandler: RouterRouteHandler = async (req, callWithRequest): Promise<any> => {
    return Promise.resolve('OK!');
  };

  /**
   * Map Router paths to handlers
   */
  router.get('/cluster/state', getClusterStateHandler);
}
