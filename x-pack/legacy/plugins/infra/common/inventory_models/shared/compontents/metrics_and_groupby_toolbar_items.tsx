/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { ToolbarProps } from '../../../../public/components/inventory/toolbars/toolbar';
import { WaffleMetricControls } from '../../../../public/components/waffle/waffle_metric_controls';
import { WaffleGroupByControls } from '../../../../public/components/waffle/waffle_group_by_controls';
import { InfraSnapshotMetricType } from '../../../../public/graphql/types';
import {
  toGroupByOpt,
  toMetricOpt,
} from '../../../../public/components/inventory/toolbars/toolbar_wrapper';

interface Props extends ToolbarProps {
  metricTypes: InfraSnapshotMetricType[];
  groupByFields: string[];
}

export const MetricsAndGroupByToolbarItems = (props: Props) => {
  const metricOptions = useMemo(() => props.metricTypes.map(toMetricOpt), [props.metricTypes]);

  const groupByOptions = useMemo(() => props.groupByFields.map(toGroupByOpt), [
    props.groupByFields,
  ]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleMetricControls
          options={metricOptions}
          metric={props.metric}
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
