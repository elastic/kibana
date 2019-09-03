/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function doesClusterExist(callWithRequest: any, clusterName: string): Promise<any> {
  try {
    const clusterInfoByName = await callWithRequest('cluster.remoteInfo');
    return Boolean(clusterInfoByName && clusterInfoByName[clusterName]);
  } catch (err) {
    throw new Error('Unable to check if cluster already exists.');
  }
}
