/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ToolbarProps } from '../../../public/components/inventory/toolbars/toolbar';
import { MetricsAndGroupByToolbarItems } from '../shared/compontents/basic_toolbar_items';
import { InfraSnapshotMetricType } from '../../graphql/types';

export const ContainerToolbarItems = (props: ToolbarProps) => {
  const metricTypes = [
    InfraSnapshotMetricType.cpu,
    InfraSnapshotMetricType.memory,
    InfraSnapshotMetricType.rx,
    InfraSnapshotMetricType.tx,
  ];
  const groupByFields = [
    'host.name',
    'cloud.availability_zone',
    'cloud.machine.type',
    'cloud.project.id',
    'cloud.provider',
    'service.type',
  ];
  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      metricTypes={metricTypes}
      groupByFields={groupByFields}
    />
  );
};
