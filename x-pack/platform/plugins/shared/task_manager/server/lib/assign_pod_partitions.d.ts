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
export declare function getPartitionMap({
  kibanasPerPartition,
  podNames,
  partitions,
}: GetPartitionMapOpts): Record<number, string[]>;
interface AssignPodPartitionsOpts {
  kibanasPerPartition: number;
  podName: string;
  podNames: string[];
  partitions: number[];
}
export declare function assignPodPartitions({
  kibanasPerPartition,
  podName,
  podNames,
  partitions,
}: AssignPodPartitionsOpts): number[];
export {};
