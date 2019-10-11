/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ApolloError } from 'apollo-client';
import React from 'react';
import { Query } from 'react-apollo';
import {
  InfraMetric,
  InfraMetricData,
  InfraNodeType,
  MetricsQuery,
  InfraTimerangeInput,
} from '../../graphql/types';
import { InfraMetricLayout } from '../../pages/metrics/layouts/types';
import { metricsQuery } from './metrics.gql_query';

interface WithMetricsArgs {
  metrics: InfraMetricData[];
  error?: ApolloError | undefined;
  loading: boolean;
  refetch: () => void;
}

interface WithMetricsProps {
  children: (args: WithMetricsArgs) => React.ReactNode;
  layouts: InfraMetricLayout[];
  nodeType: InfraNodeType;
  nodeId: string;
  cloudId: string;
  sourceId: string;
  timerange: InfraTimerangeInput;
}

export const WithMetrics = ({
  children,
  layouts,
  sourceId,
  timerange,
  nodeType,
  nodeId,
  cloudId,
}: WithMetricsProps) => {
  const metrics = layouts.reduce(
    (acc, item) => {
      return acc.concat(item.sections.map(s => s.id));
    },
    [] as InfraMetric[]
  );

  return (
    <Query<MetricsQuery.Query, MetricsQuery.Variables>
      query={metricsQuery}
      fetchPolicy="no-cache"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        metrics,
        nodeType,
        nodeId,
        cloudId,
        timerange,
      }}
    >
      {({ data, error, loading, refetch }) => {
        return children({
          metrics: filterOnlyInfraMetricData(data && data.source && data.source.metrics),
          error,
          loading,
          refetch,
        });
      }}
    </Query>
  );
};

const filterOnlyInfraMetricData = (
  metrics: Array<MetricsQuery.Metrics | null> | undefined
): InfraMetricData[] => {
  if (!metrics) {
    return [];
  }
  return metrics.filter(m => m !== null).map(m => m as InfraMetricData);
};
