/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

export async function doesClusterExist(
  clusterClient: IScopedClusterClient,
  clusterName: string
): Promise<boolean> {
  try {
    const clusterInfoByName = await clusterClient.asCurrentUser.cluster.remoteInfo();
    return Boolean(clusterInfoByName && clusterInfoByName[clusterName]);
  } catch (err) {
    throw new Error('Unable to check if cluster already exists.');
  }
}
