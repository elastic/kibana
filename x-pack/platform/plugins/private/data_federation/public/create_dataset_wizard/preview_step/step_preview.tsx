/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { DATASET_PREVIEW_QUERY, DatasetPreview, type DatasetPreviewProps } from './dataset_preview';
import { useDatasetPreview } from './use_dataset_preview';

export type StepPreviewProps = Pick<DatasetPreviewProps, 'gridState' | 'onGridStateChange'>;

export function StepPreview({ gridState, onGridStateChange }: StepPreviewProps) {
  const preview = useDatasetPreview(DATASET_PREVIEW_QUERY);
  const { isLoading, refresh } = preview;

  return (
    <div data-test-subj="createDatasetWizardPreviewStep">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>{createDatasetWizardStrings.previewStepLabel}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            data-test-subj="createDatasetWizardPreviewRefreshButton"
            iconType="refresh"
            isLoading={isLoading}
            onClick={refresh}
            size="s"
          >
            {createDatasetWizardStrings.previewRefreshButton}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{createDatasetWizardStrings.previewStepDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <DatasetPreview
        preview={preview}
        gridState={gridState}
        onGridStateChange={onGridStateChange}
      />
    </div>
  );
}
