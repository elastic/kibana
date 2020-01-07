/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { LogEntryCategory } from '../../../../../../common/http_api/log_analysis';
import { TimeRange } from '../../../../../../common/http_api/shared';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';
import { RecreateJobButton } from '../../../../../components/logging/log_analysis_job_status';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { DatasetsSelector } from './datasets_selector';
import { TopCategoriesTable } from './top_categories_table';

export const TopCategoriesSection: React.FunctionComponent<{
  availableDatasets: string[];
  isLoadingDatasets?: boolean;
  isLoadingTopCategories?: boolean;
  jobId: string;
  onChangeDatasetSelection: (datasets: string[]) => void;
  onRequestRecreateMlJob: () => void;
  selectedDatasets: string[];
  timeRange: TimeRange;
  topCategories: LogEntryCategory[];
}> = ({
  availableDatasets,
  isLoadingDatasets = false,
  isLoadingTopCategories = false,
  jobId,
  onChangeDatasetSelection,
  onRequestRecreateMlJob,
  selectedDatasets,
  timeRange,
  topCategories,
}) => {
  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="m" aria-label={title}>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RecreateJobButton onClick={onRequestRecreateMlJob} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AnalyzeInMlButton jobId={jobId} timeRange={timeRange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DatasetsSelector
        availableDatasets={availableDatasets}
        isLoading={isLoadingDatasets}
        onChangeDatasetSelection={onChangeDatasetSelection}
        selectedDatasets={selectedDatasets}
      />
      <EuiSpacer />
      <LoadingOverlayWrapper
        isLoading={isLoadingTopCategories}
        loadingChildren={<LoadingOverlayContent />}
      >
        <TopCategoriesTable timeRange={timeRange} topCategories={topCategories} />
      </LoadingOverlayWrapper>
    </>
  );
};

const title = i18n.translate('xpack.infra.logs.logEntryCategories.topCategoriesSectionTitle', {
  defaultMessage: 'Log message categories',
});

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.logEntryCategories.topCategoriesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading message categories' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
