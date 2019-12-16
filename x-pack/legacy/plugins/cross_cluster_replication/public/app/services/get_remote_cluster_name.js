/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const getFirstConnectedCluster = clusters => {
  for (let i = 0; i < clusters.length; i++) {
    if (clusters[i].isConnected) {
      return clusters[i];
    }
  }

  // No cluster connected, we return the first one in the list
  return clusters.length ? clusters[0] : {};
};

export const getRemoteClusterName = (remoteClusters, selected) => {
  return selected && remoteClusters.some(c => c.name === selected)
    ? selected
    : getFirstConnectedCluster(remoteClusters).name;
};
