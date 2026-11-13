/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { useDatasetPreview } from './use_dataset_preview';

/** The dataset does not exist until the wizard submits, so the preview runs a fixed query. */
export const DATASET_PREVIEW_QUERY = 'FROM kibana_sample_data_ecommerce';

const LazyEsqlDataGrid = React.lazy(async () => {
  const { ESQLDataGrid } = await import('@kbn/esql-datagrid/public');
  return { default: ESQLDataGrid };
});

const LoadingPrompt = ({ dataTestSubj }: { dataTestSubj: string }) => (
  <EuiEmptyPrompt
    data-test-subj={dataTestSubj}
    icon={<EuiLoadingSpinner size="l" />}
    title={<h4>{createDatasetWizardStrings.reviewPreviewLoadingTitle}</h4>}
    titleSize="xs"
  />
);

export const DatasetPreview = () => {
  const { isLoading, error, result } = useDatasetPreview(DATASET_PREVIEW_QUERY);

  if (isLoading) {
    return <LoadingPrompt dataTestSubj="createDatasetWizardReviewPreviewLoading" />;
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        color="danger"
        data-test-subj="createDatasetWizardReviewPreviewError"
        iconType="error"
        title={<h4>{createDatasetWizardStrings.reviewPreviewErrorTitle}</h4>}
        titleSize="xs"
        body={<p>{error.message}</p>}
      />
    );
  }

  if (!result || result.rows.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="createDatasetWizardReviewPreviewNoResults"
        iconType="magnify"
        title={<h4>{createDatasetWizardStrings.reviewPreviewNoResultsTitle}</h4>}
        titleSize="xs"
        body={<p>{createDatasetWizardStrings.reviewPreviewNoResultsDescription}</p>}
      />
    );
  }

  return (
    <div data-test-subj="createDatasetWizardReviewPreviewGrid">
      <Suspense
        fallback={<LoadingPrompt dataTestSubj="createDatasetWizardReviewPreviewGridLoading" />}
      >
        <LazyEsqlDataGrid
          columns={result.columns}
          controlColumnIds={['openDetails']}
          dataView={result.dataView}
          flyoutType="overlay"
          initialRowHeight={0}
          isTableView
          query={result.query}
          rows={result.rows}
        />
      </Suspense>
    </div>
  );
};
