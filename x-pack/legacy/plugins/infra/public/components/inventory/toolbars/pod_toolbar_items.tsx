/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { ToolbarProps } from './toolbar';
import { WaffleMetricControls } from '../../waffle/waffle_metric_controls';
import { WaffleGroupByControls } from '../../waffle/waffle_group_by_controls';
import { InfraSnapshotMetricType } from '../../../graphql/types';
import { ToolbarTranslations, mapFieldToOption } from './toolbar_wrapper';

export const PodToolbarItems = (props: ToolbarProps) => {
  const options = useMemo(() => {
    return [
      {
        text: ToolbarTranslations.CPUUsage,
        value: InfraSnapshotMetricType.cpu,
      },
      {
        text: ToolbarTranslations.MemoryUsage,
        value: InfraSnapshotMetricType.memory,
      },
      {
        text: ToolbarTranslations.InboundTraffic,
        value: InfraSnapshotMetricType.rx,
      },
      {
        text: ToolbarTranslations.OutboundTraffic,
        value: InfraSnapshotMetricType.tx,
      },
    ];
  }, []);

  const groupByOptions = useMemo(
    () => ['kubernetes.namespace', 'kubernetes.node.name', 'service.type'].map(mapFieldToOption),
    []
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleMetricControls
          metric={props.metric}
          options={options}
          onChange={props.changeMetric}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WaffleGroupByControls
          options={groupByOptions}
          groupBy={props.groupBy}
          nodeType={props.nodeType}
          onChange={props.changeGroupBy}
          fields={props.createDerivedIndexPattern('metrics').fields}
          onChangeCustomOptions={props.changeCustomOptions}
          customOptions={props.customOptions}
        />
      </EuiFlexItem>
    </>
  );
};
