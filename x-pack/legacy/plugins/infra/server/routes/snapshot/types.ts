/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWrappableRequest } from '../../lib/adapters/framework';

export interface InfraSnapshotNode {
  path: InfraSnapshotNodePath[];

  metric: InfraSnapshotNodeMetric;
}

export interface InfraSnapshotNodePath {
  value: string;

  label: string;

  ip?: string | null;
}

export interface InfraSnapshotNodeMetric {
  name: InfraSnapshotMetricType;

  value?: number | null;

  avg?: number | null;

  max?: number | null;
}

export enum InfraSnapshotMetricType {
  count = 'count',
  cpu = 'cpu',
  load = 'load',
  memory = 'memory',
  tx = 'tx',
  rx = 'rx',
  logRate = 'logRate',
}

export interface InfraNodeIdsInput {
  nodeId: string;

  cloudId?: string | null;
}

export enum InfraNodeType {
  pod = 'pod',
  container = 'container',
  host = 'host',
}

export interface InfraTimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: number;
  /** The beginning of the timerange */
  from: number;
}

export enum InfraMetric {
  hostSystemOverview = 'hostSystemOverview',
  hostCpuUsage = 'hostCpuUsage',
  hostFilesystem = 'hostFilesystem',
  hostK8sOverview = 'hostK8sOverview',
  hostK8sCpuCap = 'hostK8sCpuCap',
  hostK8sDiskCap = 'hostK8sDiskCap',
  hostK8sMemoryCap = 'hostK8sMemoryCap',
  hostK8sPodCap = 'hostK8sPodCap',
  hostLoad = 'hostLoad',
  hostMemoryUsage = 'hostMemoryUsage',
  hostNetworkTraffic = 'hostNetworkTraffic',
  hostDockerOverview = 'hostDockerOverview',
  hostDockerInfo = 'hostDockerInfo',
  hostDockerTop5ByCpu = 'hostDockerTop5ByCpu',
  hostDockerTop5ByMemory = 'hostDockerTop5ByMemory',
  podOverview = 'podOverview',
  podCpuUsage = 'podCpuUsage',
  podMemoryUsage = 'podMemoryUsage',
  podLogUsage = 'podLogUsage',
  podNetworkTraffic = 'podNetworkTraffic',
  containerOverview = 'containerOverview',
  containerCpuKernel = 'containerCpuKernel',
  containerCpuUsage = 'containerCpuUsage',
  containerDiskIOOps = 'containerDiskIOOps',
  containerDiskIOBytes = 'containerDiskIOBytes',
  containerMemory = 'containerMemory',
  containerNetworkTraffic = 'containerNetworkTraffic',
  nginxHits = 'nginxHits',
  nginxRequestRate = 'nginxRequestRate',
  nginxActiveConnections = 'nginxActiveConnections',
  nginxRequestsPerConnection = 'nginxRequestsPerConnection',
  awsOverview = 'awsOverview',
  awsCpuUtilization = 'awsCpuUtilization',
  awsNetworkBytes = 'awsNetworkBytes',
  awsNetworkPackets = 'awsNetworkPackets',
  awsDiskioBytes = 'awsDiskioBytes',
  awsDiskioOps = 'awsDiskioOps',
  custom = 'custom',
}

export interface SnapshotArgs {
  timerange: InfraTimerangeInput;

  filterQuery?: string | null;
}

export interface MetricsArgs {
  nodeIds: InfraNodeIdsInput;

  nodeType: InfraNodeType;

  timerange: InfraTimerangeInput;

  metrics: InfraMetric[];
}

export interface InfraSnapshotGroupbyInput {
  /** The label to use in the results for the group by for the terms group by */
  label?: string | null;
  /** The field to group by from a terms aggregation, this is ignored by the filter type */
  field?: string | null;
}

export interface InfraSnapshotMetricInput {
  /** The type of metric */
  type: InfraSnapshotMetricType;
}

export interface NodesArgs {
  nodeType: InfraNodeType;

  groupBy: InfraSnapshotGroupbyInput[];

  metric: InfraSnapshotMetricInput;
}

export interface SourceArgs {
  sourceId: string;
}

export type SnapshotRequest = InfraWrappableRequest<NodesArgs & SnapshotArgs & SourceArgs>;
