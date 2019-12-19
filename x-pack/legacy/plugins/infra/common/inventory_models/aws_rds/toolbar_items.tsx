/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ToolbarProps } from '../../../public/components/inventory/toolbars/toolbar';
import { InfraSnapshotMetricType } from '../../../public/graphql/types';
import { MetricsAndGroupByToolbarItems } from '../shared/compontents/metrics_and_groupby_toolbar_items';
import { CloudToolbarItems } from '../shared/compontents/cloud_toolbar_items';

export const AwsRDSToolbarItems = (props: ToolbarProps) => {
  const metricTypes = [
    InfraSnapshotMetricType.cpu,
    InfraSnapshotMetricType.rdsConnections,
    InfraSnapshotMetricType.rdsQueriesExecuted,
    InfraSnapshotMetricType.rdsActiveTransactions,
    InfraSnapshotMetricType.rdsLatency,
  ];
  const groupByFields = [
    'cloud.availability_zone',
    'aws.rds.db_instance.class',
    'aws.rds.db_instance.status',
  ];
  return (
    <>
      <CloudToolbarItems {...props} />
      <MetricsAndGroupByToolbarItems
        {...props}
        metricTypes={metricTypes}
        groupByFields={groupByFields}
      />
    </>
  );
};
