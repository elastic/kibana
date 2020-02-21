/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { TIMEOUT } from './constants';

// From https://www.elastic.co/guide/en/elasticsearch/reference/current/get-license.html
export interface ESLicense {
  status: string;
  uid: string;
  type: string;
  issue_date: string;
  issue_date_in_millis: number;
  expiry_date: string;
  expirty_date_in_millis: number;
  max_nodes: number;
  issued_to: string;
  issuer: string;
  start_date_in_millis: number;
}

let cachedLicense: ESLicense | undefined;

function getLicense(callCluster: CallCluster, local: boolean) {
  return callCluster<{ license: ESLicense }>('transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local,
      // For versions >= 7.6 and < 8.0, this flag is needed otherwise 'platinum' is returned for 'enterprise' license.
      accept_enterprise: 'true',
    },
  });
}

/**
 * Get the cluster's license from the connected node.
 *
 * This is the equivalent of GET /_license?local=true .
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 */
export async function getXPackLicense(callCluster: CallCluster) {
  // Fetching the local license is cheaper than getting it from the master and good enough
  const { license } = await getLicense(callCluster, true).catch(async err => {
    if (cachedLicense) {
      try {
        // Fallback to the master node's license info
        const response = await getLicense(callCluster, false);
        return response;
      } catch (masterError) {
        if (masterError.statusCode === 404) {
          // If the master node does not have a license, we can assume there is no license
          cachedLicense = undefined;
        } else {
          // Any other errors from the master node, throw and do not send any telemetry
          throw err;
        }
      }
    }
    return { license: void 0 };
  });

  if (license) {
    cachedLicense = license;
  }
  return license;
}

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent of GET /_xpack/usage?master_timeout=${TIMEOUT}
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 */
export function getXPackUsage(callCluster: CallCluster) {
  return callCluster('transport.request', {
    method: 'GET',
    path: '/_xpack/usage',
    query: {
      master_timeout: TIMEOUT,
    },
  });
}
