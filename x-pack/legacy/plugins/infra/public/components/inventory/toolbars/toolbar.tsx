/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { Action } from 'typescript-fsa';
import {
  InfraNodeType,
  InfraSnapshotMetricInput,
  InfraSnapshotGroupbyInput,
} from '../../../graphql/types';
import { HostToolbarItems } from './host_toolbar_items';
import { PodToolbarItems } from './pod_toolbar_items';
import { ContainerToolbarItems } from './container_toolbar_items';
import { ToolbarWrapper } from './toolbar_wrapper';

import { waffleOptionsSelectors } from '../../../store';
import { InfraGroupByOptions } from '../../../lib/lib';

export interface ToolbarProps {
  createDerivedIndexPattern: (type: 'logs' | 'metrics' | 'both') => StaticIndexPattern;
  changeMetric: (payload: InfraSnapshotMetricInput) => Action<InfraSnapshotMetricInput>;
  changeGroupBy: (payload: InfraSnapshotGroupbyInput[]) => Action<InfraSnapshotGroupbyInput[]>;
  changeCustomOptions: (payload: InfraGroupByOptions[]) => Action<InfraGroupByOptions[]>;
  customOptions: ReturnType<typeof waffleOptionsSelectors.selectCustomOptions>;
  groupBy: ReturnType<typeof waffleOptionsSelectors.selectGroupBy>;
  metric: ReturnType<typeof waffleOptionsSelectors.selectMetric>;
  nodeType: ReturnType<typeof waffleOptionsSelectors.selectNodeType>;
}

const withProps = (Element: (props: ToolbarProps) => JSX.Element) => {
  return <ToolbarWrapper>{props => <Element {...props} />}</ToolbarWrapper>;
};

export const Toolbar = (props: ToolbarProps) => {
  switch (props.nodeType) {
    case InfraNodeType.host:
      return withProps(HostToolbarItems);
    case InfraNodeType.pod:
      return withProps(PodToolbarItems);
    case InfraNodeType.container:
      return withProps(ContainerToolbarItems);
    default:
      return null;
  }
};
