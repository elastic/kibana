/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ToolbarProps } from '../../../public/components/inventory/toolbars/toolbar';
import { InfraSnapshotMetricType } from '../../../public/graphql/types';
import { MetricsAndGroupByToolbarItems } from '../shared/compontents/metrics_and_groupby_toolbar_items';

export const AwsS3ToolbarItems = (props: ToolbarProps) => {
  const metricTypes = [
    InfraSnapshotMetricType.s3BucketSize,
    InfraSnapshotMetricType.s3NumberOfObjects,
    InfraSnapshotMetricType.s3TotalRequests,
    InfraSnapshotMetricType.s3DownloadBytes,
    InfraSnapshotMetricType.s3UploadBytes,
  ];
  const groupByFields = ['cloud.region'];
  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      metricTypes={metricTypes}
      groupByFields={groupByFields}
    />
  );
};
