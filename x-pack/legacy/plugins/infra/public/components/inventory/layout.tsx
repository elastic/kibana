/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraWaffleMapOptions, InfraWaffleMapBounds } from '../../lib/lib';
import { InfraNodeType, InfraSnapshotNode, InfraTimerangeInput } from '../../graphql/types';
import { KueryFilterQuery } from '../../store/local/waffle_filter';

import { NodesOverview } from '../nodes_overview';
import { Toolbar } from './toolbars/toolbar';
import { PageContent } from '../page';

export interface LayoutProps {
  options: InfraWaffleMapOptions;
  nodeType: InfraNodeType;
  nodes: InfraSnapshotNode[];
  loading: boolean;
  reload: () => void;
  onDrilldown: (filter: KueryFilterQuery) => void;
  timeRange: InfraTimerangeInput;
  onViewChange: (view: string) => void;
  view: string;
  boundsOverride: InfraWaffleMapBounds;
  autoBounds: boolean;
}

export const Layout = (props: LayoutProps) => {
  return (
    <>
      <Toolbar nodeType={props.nodeType} />
      <PageContent>
        <NodesOverview {...props} />
      </PageContent>
    </>
  );
};
