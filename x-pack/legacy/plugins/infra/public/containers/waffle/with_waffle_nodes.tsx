/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from 'react-apollo';

import {
  InfraSnapshotMetricInput,
  InfraSnapshotNode,
  InfraNodeType,
  InfraSnapshotGroupbyInput,
  WaffleNodesQuery,
} from '../../graphql/types';
import { waffleNodesQuery } from './waffle_nodes.gql_query';

interface WithWaffleNodesArgs {
  nodes: InfraSnapshotNode[];
  loading: boolean;
  refetch: () => void;
}

interface WithWaffleNodesProps {
  children: (args: WithWaffleNodesArgs) => React.ReactNode;
  filterQuery: string | null | undefined;
  metric: InfraSnapshotMetricInput;
  groupBy: InfraSnapshotGroupbyInput[];
  nodeType: InfraNodeType;
  sourceId: string;
  currentTime: number;
}

export const WithWaffleNodes = ({
  children,
  filterQuery,
  metric,
  groupBy,
  nodeType,
  sourceId,
  currentTime,
}: WithWaffleNodesProps) => {
  const timerange = {
    interval: '1m',
    to: currentTime,
    from: currentTime - 360 * 1000,
  };
  return (
    <Query<WaffleNodesQuery.Query, WaffleNodesQuery.Variables>
      query={waffleNodesQuery}
      fetchPolicy="network-only"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        metric,
        groupBy: [...groupBy],
        type: nodeType,
        timerange,
        filterQuery,
      }}
    >
      {({ data, loading, refetch, error }) =>
        children({
          loading,
          nodes:
            !error && data && data.source && data.source.snapshot && data.source.snapshot.nodes
              ? data.source.snapshot.nodes
              : [],
          refetch,
        })
      }
    </Query>
  );
};
