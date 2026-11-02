/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * Fork of lib/task_partitioner.ts. Identical logic (shares
 * assignPodPartitions), only re-based onto the raw-ES discovery fork.
 */

import { assignPodPartitions } from '../lib/assign_pod_partitions';
import type { CoordinatorDiscoveryService } from './coordinator_discovery';
import type { CoordinatorLogger } from './types';

function range(start: number, end: number) {
  const nums: number[] = [];
  for (let i = start; i < end; ++i) nums.push(i);
  return nums;
}

export const MAX_PARTITIONS = 256;
export const CACHE_INTERVAL = 10000;

export interface CoordinatorPartitionerOpts {
  discoveryService: CoordinatorDiscoveryService;
  kibanasPerPartition: number;
  podName: string;
  logger: CoordinatorLogger;
}

export class CoordinatorPartitioner {
  private readonly allPartitions: number[];
  private readonly podName: string;
  private readonly kibanasPerPartition: number;
  private readonly logger: CoordinatorLogger;
  private readonly discoveryService: CoordinatorDiscoveryService;
  private podPartitions: number[] = [];
  private podPartitionsLastUpdated: number;

  constructor(opts: CoordinatorPartitionerOpts) {
    this.allPartitions = range(0, MAX_PARTITIONS);
    this.podName = opts.podName;
    this.kibanasPerPartition = opts.kibanasPerPartition;
    this.discoveryService = opts.discoveryService;
    this.podPartitionsLastUpdated = Date.now() - CACHE_INTERVAL;
    this.logger = opts.logger;
  }

  getPodName(): string {
    return this.podName;
  }

  async getPartitions(): Promise<number[]> {
    const lastUpdated = this.podPartitionsLastUpdated;
    const now = Date.now();
    if (now - lastUpdated >= CACHE_INTERVAL || this.podPartitions.length === 0) {
      try {
        const nodes = await this.discoveryService.getActiveKibanaNodes();
        this.podPartitions = assignPodPartitions({
          kibanasPerPartition: this.kibanasPerPartition,
          podName: this.podName,
          podNames: nodes.map((node) => node.attributes.id),
          partitions: this.allPartitions,
        });
        this.podPartitionsLastUpdated = now;
      } catch (error) {
        this.logger.error(`Failed to load list of active kibana nodes: ${error.message}`);
        return this.podPartitions;
      }
    }
    return this.podPartitions;
  }
}
