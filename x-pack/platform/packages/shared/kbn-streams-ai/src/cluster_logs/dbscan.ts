/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Clusters dataset based on [DBSCAN](https://en.wikipedia.org/wiki/DBSCAN).
 * Implementation based on [density-clustering](https://github.com/astrolukasz/density-clustering/blob/master/lib/DBSCAN.js),
 * which is a 10 year old library without any updates since, so reimplemented here.
 */
export function dbscan<T>(
  dataset: T[],
  epsilon: number,
  minPts: number,
  distanceFn: (left: T, right: T) => number
): { clusters: number[][]; noise: number[] } {
  const datasetLength = dataset.length;
  const visited = new Uint8Array(datasetLength);
  const assigned = new Uint8Array(datasetLength);
  const noise: number[] = [];

  const clusters: number[][] = [];

  function regionQuery(pointId: number) {
    const neighbors = [];

    for (let id = 0; id < datasetLength; id++) {
      const dist = distanceFn(dataset[pointId], dataset[id]);
      if (dist < epsilon) {
        neighbors.push(id);
      }
    }
    return neighbors;
  }

  function addToCluster(pointId: number, clusterId: number) {
    clusters[clusterId].push(pointId);
    assigned[pointId] = 1;
  }

  function expandCluster(clusterId: number, neighbors: number[]) {
    const neighborQueued = new Uint8Array(datasetLength);
    for (let i = 0; i < neighbors.length; i++) {
      neighborQueued[neighbors[i]] = 1;
    }

    /**
     * It's very important to calculate length of neighbors array each time,
     * as the number of elements changes over time
     */
    for (let i = 0; i < neighbors.length; i++) {
      const pointId2 = neighbors[i];

      if (visited[pointId2] !== 1) {
        visited[pointId2] = 1;
        const neighbors2 = regionQuery(pointId2);

        if (neighbors2.length >= minPts) {
          for (let j = 0; j < neighbors2.length; j++) {
            const neighborId = neighbors2[j];
            if (neighborQueued[neighborId] !== 1) {
              neighbors.push(neighborId);
              neighborQueued[neighborId] = 1;
            }
          }
        }
      }

      // add to cluster
      if (assigned[pointId2] !== 1) {
        addToCluster(pointId2, clusterId);
      }
    }
  }

  for (let pointId = 0; pointId < datasetLength; pointId++) {
    // if point is not visited, check if it forms a cluster
    if (visited[pointId] !== 1) {
      visited[pointId] = 1;

      // if closest neighborhood is too small to form a cluster, mark as noise
      const neighbors = regionQuery(pointId);

      if (neighbors.length < minPts) {
        noise.push(pointId);
      } else {
        // create new cluster and add point
        const clusterId = clusters.length;
        clusters.push([]);
        addToCluster(pointId, clusterId);
        expandCluster(clusterId, neighbors);
      }
    }
  }

  return { clusters, noise };
}
