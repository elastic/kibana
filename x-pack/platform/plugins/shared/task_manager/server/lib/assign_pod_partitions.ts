/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GetPartitionMapOpts {
  kibanasPerPartition: number;
  partitions: number[];
  podNames: string[];
}

export function getPartitionMap({
  kibanasPerPartition,
  podNames,
  partitions,
}: GetPartitionMapOpts): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  let counter = 0;
  for (const partition of partitions) {
    map[partition] = [];
    for (let i = 0; i < kibanasPerPartition; i++) {
      map[partition].push(podNames.sort()[counter++ % podNames.length]);
    }
  }
  return map;
}

interface AssignPodPartitionsOpts {
  kibanasPerPartition: number;
  podName: string;
  podNames: string[];
  partitions: number[];
}

export function assignPodPartitions({
  kibanasPerPartition,
  podName,
  podNames,
  partitions,
}: AssignPodPartitionsOpts): number[] {
  const map = getPartitionMap({ kibanasPerPartition, podNames, partitions });
  const podPartitions: number[] = [];
  for (const partition of Object.keys(map)) {
    if (map[Number(partition)].indexOf(podName) !== -1) {
      podPartitions.push(Number(partition));
    }
  }
  return podPartitions;
}
