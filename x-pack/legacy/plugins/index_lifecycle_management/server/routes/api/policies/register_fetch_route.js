/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function formatPolicies(policiesMap) {
  if (policiesMap.status === 404) {
    return [];
  }
  return Object.keys(policiesMap).reduce((accum, lifecycleName) => {
    const policyEntry = policiesMap[lifecycleName];
    accum.push({
      ...policyEntry,
      name: lifecycleName,
    });
    return accum;
  }, []);
}

async function fetchPolicies(callWithRequest) {
  const params = {
    method: 'GET',
    path: '/_ilm/policy',
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  return await callWithRequest('transport.request', params);
}
async function addLinkedIndices(policiesMap, callWithRequest) {
  if (policiesMap.status === 404) {
    return policiesMap;
  }
  const params = {
    method: 'GET',
    path: '/*/_ilm/explain',
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  const policyExplanation = await callWithRequest('transport.request', params);
  Object.entries(policyExplanation.indices).forEach(([indexName, { policy }]) => {
    if (policy && policiesMap[policy]) {
      policiesMap[policy].linkedIndices = policiesMap[policy].linkedIndices || [];
      policiesMap[policy].linkedIndices.push(indexName);
    }
  });
}

export function registerFetchRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/policies',
    method: 'GET',
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { withIndices } = request.query;
      try {
        const policiesMap = await fetchPolicies(callWithRequest);
        if (withIndices) {
          await addLinkedIndices(policiesMap, callWithRequest);
        }
        return formatPolicies(policiesMap);
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
