/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

const NodeDetailsDataPointRT = rt.intersection([
  rt.type({
    timestamp: rt.number,
  }),
  rt.partial({
    value: rt.number,
  }),
]);

const NodeDetailsDataSeries = rt.type({
  id: rt.string,
  label: rt.string,
  data: rt.array(NodeDetailsDataPointRT),
});

const NodeDetailsMetricsRT = rt.keyof({
  hostSystemOverview: 'hostSystemOverview',
  hostCpuUsage: 'hostCpuUsage',
  hostFilesystem: 'hostFilesystem',
  hostK8sOverview: 'hostK8sOverview',
  hostK8sCpuCap: 'hostK8sCpuCap',
  hostK8sDiskCap: 'hostK8sDiskCap',
  hostK8sMemoryCap: 'hostK8sMemoryCap',
  hostK8sPodCap: 'hostK8sPodCap',
  hostLoad: 'hostLoad',
  hostMemoryUsage: 'hostMemoryUsage',
  hostNetworkTraffic: 'hostNetworkTraffic',
  hostDockerOverview: 'hostDockerOverview',
  hostDockerInfo: 'hostDockerInfo',
  hostDockerTop5ByCpu: 'hostDockerTop5ByCpu',
  hostDockerTop5ByMemory: 'hostDockerTop5ByMemory',
  podOverview: 'podOverview',
  podCpuUsage: 'podCpuUsage',
  podMemoryUsage: 'podMemoryUsage',
  podLogUsage: 'podLogUsage',
  podNetworkTraffic: 'podNetworkTraffic',
  containerOverview: 'containerOverview',
  containerCpuKernel: 'containerCpuKernel',
  containerCpuUsage: 'containerCpuUsage',
  containerDiskIOOps: 'containerDiskIOOps',
  containerDiskIOBytes: 'containerDiskIOBytes',
  containerMemory: 'containerMemory',
  containerNetworkTraffic: 'containerNetworkTraffic',
  nginxHits: 'nginxHits',
  nginxRequestRate: 'nginxRequestRate',
  nginxActiveConnections: 'nginxActiveConnections',
  nginxRequestsPerConnection: 'nginxRequestsPerConnection',
  awsOverview: 'awsOverview',
  awsCpuUtilization: 'awsCpuUtilization',
  awsNetworkBytes: 'awsNetworkBytes',
  awsNetworkPackets: 'awsNetworkPackets',
  awsDiskioBytes: 'awsDiskioBytes',
  awsDiskioOps: 'awsDiskioOps',
  custom: 'custom',
});

export const NodeDetailsMetricDataRT = rt.intersection([
  rt.partial({ id: NodeDetailsMetricsRT }),
  rt.type({
    series: rt.array(NodeDetailsDataSeries),
  }),
]);

export const NodeDetailsMetricDataResponseRT = rt.type({
  metrics: rt.array(NodeDetailsMetricDataRT),
});

export type NodeDetailsMetricDataResponse = rt.TypeOf<typeof NodeDetailsMetricDataResponseRT>;
