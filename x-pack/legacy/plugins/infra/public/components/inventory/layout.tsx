/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraWaffleMapOptions, InfraWaffleMapBounds } from '../../lib/lib';
import {
  InfraNodeType,
  InfraSnapshotMetricInput,
  InfraSnapshotGroupbyInput,
} from '../../graphql/types';
import { KueryFilterQuery } from '../../store/local/waffle_filter';

import { NodesOverview } from '../nodes_overview';
import { Toolbar } from './toolbars/toolbar';
import { PageContent } from '../page';
import { useSnapshot } from '../../containers/waffle/use_snaphot';

export interface LayoutProps {
  options: InfraWaffleMapOptions;
  nodeType: InfraNodeType;
  onDrilldown: (filter: KueryFilterQuery) => void;
  currentTime: number;
  onViewChange: (view: string) => void;
  view: string;
  boundsOverride: InfraWaffleMapBounds;
  autoBounds: boolean;

  filterQuery: string | null | undefined;
  metric: InfraSnapshotMetricInput;
  groupBy: InfraSnapshotGroupbyInput[];
  sourceId: string;
}

export const Layout = (props: LayoutProps) => {
  const { loading, nodes, reload, interval } = useSnapshot(
    props.filterQuery,
    props.metric,
    props.groupBy,
    props.nodeType,
    props.sourceId,
    props.currentTime
  );
  return (
    <>
      <Toolbar nodeType={props.nodeType} />
      <PageContent>
        <NodesOverview
          nodes={nodes}
          options={props.options}
          nodeType={props.nodeType}
          loading={loading}
          reload={reload}
          onDrilldown={props.onDrilldown}
          currentTime={props.currentTime}
          onViewChange={props.onViewChange}
          view={props.view}
          autoBounds={props.autoBounds}
          boundsOverride={props.boundsOverride}
          interval={interval}
        />
      </PageContent>
    </>
  );
};
