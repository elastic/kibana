/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function setCollectionInterval(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const params = {
    body: {
      transient: { 'xpack.monitoring.collection.interval': null }, // clears the disabling method used in testing environment
      persistent: { 'xpack.monitoring.collection.interval': '10s' },
    },
  };

  // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-cluster-putsettings
  return callWithRequest(req, 'cluster.putSettings', params);
}
