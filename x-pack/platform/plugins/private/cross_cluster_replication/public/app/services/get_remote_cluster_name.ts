/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoteClusterRow } from './api';

const getFirstConnectedCluster = (
  clusters: RemoteClusterRow[]
): RemoteClusterRow | Record<string, never> => {
  for (let i = 0; i < clusters.length; i++) {
    if (clusters[i].isConnected) {
      return clusters[i];
    }
  }

  // No cluster connected, we return the first one in the list
  return clusters.length ? clusters[0] : {};
};

export const getRemoteClusterName = (
  remoteClusters: RemoteClusterRow[],
  selected: string | undefined
): string | undefined => {
  if (selected && remoteClusters.some((c) => c.name === selected)) {
    return selected;
  }
  const first = getFirstConnectedCluster(remoteClusters);
  return 'name' in first ? first.name : undefined;
};
