/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiSpacer, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { LogEntryCategory } from '../../../../../../common/http_api/log_analysis';
import { TimeRange } from '../../../../../../common/http_api/shared';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';
import { RecreateJobButton } from '../../../../../components/logging/log_analysis_job_status';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { TopCategoriesTable } from './top_categories_table';

export const TopCategoriesSection: React.FunctionComponent<{
  jobId: string;
  onRequestRecreateMlJob: () => void;
  timeRange: TimeRange;
  isLoading: boolean;
  topCategories: LogEntryCategory[];
}> = ({ isLoading, jobId, onRequestRecreateMlJob, timeRange, topCategories }) => {
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
      <LoadingOverlayWrapper isLoading={isLoading} loadingChildren={<LoadingOverlayContent />}>
        <TopCategoriesTable topCategories={topCategories} />
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
