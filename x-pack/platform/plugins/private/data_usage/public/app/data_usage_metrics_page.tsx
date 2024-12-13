/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { DataUsagePage } from './components/page';
import { DATA_USAGE_PAGE } from '../translations';
import { DataUsageMetrics } from './components/data_usage_metrics';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

export interface DataUsageMetricsPageProps {
  'data-test-subj'?: string;
}
export const DataUsageMetricsPage = memo<DataUsageMetricsPageProps>(
  ({ 'data-test-subj': dataTestSubj = 'data-usage' }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <DataUsagePage
        data-test-subj={getTestId('page')}
        title={DATA_USAGE_PAGE.title}
        subtitle={DATA_USAGE_PAGE.subTitle}
      >
        <DataUsageMetrics data-test-subj={getTestId('metrics')} />
      </DataUsagePage>
    );
  }
);

DataUsageMetricsPage.displayName = 'DataUsageMetricsPage';
