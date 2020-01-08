/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ApolloError } from 'apollo-client';
import React from 'react';
import { Query } from 'react-apollo';
import { i18n } from '@kbn/i18n';
import {
  InfraMetric,
  InfraMetricData,
  InfraNodeType,
  MetricsQuery,
  InfraTimerangeInput,
} from '../../../graphql/types';
import { metricsQuery } from './metrics.gql_query';
import { InventoryMetric, InventoryMetricRT } from '../../../../common/inventory_models/types';

interface WithMetricsArgs {
  metrics: InfraMetricData[];
  error?: ApolloError | undefined;
  loading: boolean;
  refetch: () => void;
}

interface WithMetricsProps {
  children: (args: WithMetricsArgs) => React.ReactNode;
  requiredMetrics: InventoryMetric[];
  nodeType: InfraNodeType;
  nodeId: string;
  cloudId: string;
  sourceId: string;
  timerange: InfraTimerangeInput;
}

const isInfraMetrics = (subject: any[]): subject is InfraMetric[] => {
  return subject.every(s => InventoryMetricRT.is(s));
};

export const WithMetrics = ({
  children,
  requiredMetrics,
  sourceId,
  timerange,
  nodeType,
  nodeId,
  cloudId,
}: WithMetricsProps) => {
  if (!isInfraMetrics(requiredMetrics)) {
    throw new Error(
      i18n.translate('xpack.infra.invalidInventoryMetricsError', {
        defaultMessage: 'One of the InfraMetric is invalid',
      })
    );
  }

  return (
    <Query<MetricsQuery.Query, MetricsQuery.Variables>
      query={metricsQuery}
      fetchPolicy="no-cache"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        metrics: requiredMetrics,
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
