/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest } from '../../../types';

export function setCollectionDisabled(req: LegacyRequest) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const params = {
    transient: { 'xpack.monitoring.elasticsearch.collection.enabled': null }, // clears the disabling method used in testing environment
    persistent: { 'xpack.monitoring.elasticsearch.collection.enabled': false },
  };

  // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-cluster-putsettings
  return callWithRequest(req, 'cluster.putSettings', params);
}
