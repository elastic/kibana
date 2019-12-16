/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Factory for acquiring a method that can send an authenticated query to Elasticsearch.
 *
 * The method can either:
 * - take authentication from an HTTP request object, which should be used when
 *   the caller is an HTTP API
 * - fabricate authentication using the system username and password from the
 *   Kibana config, which should be used when the caller is an internal process
 *
 * @param {Object} server: the Kibana server object
 * @return {Function}: callCluster function
 */
export function callClusterFactory(server) {
  const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );

  return {
    /*
     * caller is coming from a request, so use callWithRequest with actual
     * Authorization header credentials
     * @param {Object} req: HTTP request object
     */
    getCallClusterWithReq(req) {
      if (req === undefined) {
        throw new Error('request object is required');
      }
      return (...args) => callWithRequest(req, ...args);
    },

    getCallClusterInternal() {
      /*
       * caller is an internal function of the stats collection system, so use
       * internal system user
       */
      return callWithInternalUser;
    },
  };
}
