/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metricsSchema: any = gql`
  enum InfraMetric {
    hostSystemOverview
    hostCpuUsage
    hostFilesystem
    hostK8sOverview
    hostK8sCpuCap
    hostK8sDiskCap
    hostK8sMemoryCap
    hostK8sPodCap
    hostLoad
    hostMemoryUsage
    hostNetworkTraffic
    hostDockerOverview
    hostDockerInfo
    hostDockerTop5ByCpu
    hostDockerTop5ByMemory
    podOverview
    podCpuUsage
    podMemoryUsage
    podLogUsage
    podNetworkTraffic
    containerOverview
    containerCpuKernel
    containerCpuUsage
    containerDiskIOOps
    containerDiskIOBytes
    containerMemory
    containerNetworkTraffic
    nginxHits
    nginxRequestRate
    nginxActiveConnections
    nginxRequestsPerConnection
    awsOverview
    awsCpuUtilization
    awsNetworkBytes
    awsNetworkPackets
    awsDiskioBytes
    awsDiskioOps
    custom
  }

  type InfraMetricData {
    id: InfraMetric
    series: [InfraDataSeries!]!
  }

  type InfraDataSeries {
    id: ID!
    label: String!
    data: [InfraDataPoint!]!
  }

  type InfraDataPoint {
    timestamp: Float!
    value: Float
  }

  input InfraNodeIdsInput {
    nodeId: ID!
    cloudId: ID
  }

  extend type InfraSource {
    metrics(
      nodeIds: InfraNodeIdsInput!
      nodeType: InfraNodeType!
      timerange: InfraTimerangeInput!
      metrics: [InfraMetric!]!
    ): [InfraMetricData!]!
  }
`;
