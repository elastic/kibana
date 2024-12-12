/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataUsagePage } from './components/page';
import { DATA_USAGE_PAGE } from '../translations';
import { DataUsageMetrics } from './components/data_usage_metrics';

export const DataUsageMetricsPage = () => {
  return (
    <DataUsagePage
      data-test-subj="DataUsagePage"
      title={DATA_USAGE_PAGE.title}
      subtitle={DATA_USAGE_PAGE.subTitle}
    >
      <DataUsageMetrics />
    </DataUsagePage>
  );
};

DataUsageMetricsPage.displayName = 'DataUsageMetricsPage';
