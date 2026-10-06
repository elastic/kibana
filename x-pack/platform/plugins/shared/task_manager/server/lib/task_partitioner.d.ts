/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'elastic-apm-node';
import type { KibanaDiscoveryService } from '../kibana_discovery_service';
export declare const MAX_PARTITIONS = 256;
export declare const CACHE_INTERVAL = 10000;
export interface TaskPartitionerConstructorOpts {
  kibanaDiscoveryService: KibanaDiscoveryService;
  kibanasPerPartition: number;
  podName: string;
  logger: Logger;
}
export declare class TaskPartitioner {
  private readonly allPartitions;
  private readonly podName;
  private readonly kibanasPerPartition;
  private readonly logger;
  private kibanaDiscoveryService;
  private podPartitions;
  private podPartitionsLastUpdated;
  constructor(opts: TaskPartitionerConstructorOpts);
  getAllPartitions(): number[];
  getPodName(): string;
  getPodPartitions(): number[];
  getPartitions(): Promise<number[]>;
  private getAllPodNames;
}
