/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { TestConfigurationPreviewContent } from '../test_configuration_preview';
import { TEST_CONFIGURATION_PREVIEW_ROW_COUNT } from '../test_configuration_preview_utils';

const PREVIEW_RESULTS_LOADING_MS = 600;

export interface PreviewResultsStepProps {
  values: DatasetWizardFormValues;
}

export const PreviewResultsStep: FunctionComponent<PreviewResultsStepProps> = ({ values }) => {
  const [previewedValues, setPreviewedValues] = useState<DatasetWizardFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<number | undefined>();

  useEffect(
    () => () => {
      if (loadingTimeoutRef.current !== undefined) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    },
    []
  );

  const hasPreview = previewedValues !== null && !isLoading;

  const handlePreview = () => {
    const valuesToPreview = values;

    if (loadingTimeoutRef.current !== undefined) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

    setIsLoading(true);
    loadingTimeoutRef.current = window.setTimeout(() => {
      setPreviewedValues(valuesToPreview);
      setIsLoading(false);
      loadingTimeoutRef.current = undefined;
    }, PREVIEW_RESULTS_LOADING_MS);
  };

  return (
    <div data-test-subj="datasetWizardPreviewResultsStep">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{datasetWizardStrings.previewResultsTitle()}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {hasPreview ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              color="text"
              size="s"
              onClick={handlePreview}
              aria-label={datasetWizardStrings.previewResultsRefreshAriaLabel()}
              data-test-subj="datasetWizardPreviewResultsRefreshButton"
            >
              {datasetWizardStrings.previewResultsRefreshButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.testConfigurationPreviewDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {hasPreview && previewedValues ? (
        <TestConfigurationPreviewContent
          values={previewedValues}
          maxVisibleRows={TEST_CONFIGURATION_PREVIEW_ROW_COUNT}
        />
      ) : isLoading ? (
        <TestConfigurationPreviewContent values={values} isLoading />
      ) : (
        <EuiButton data-test-subj="datasetWizardPreviewResultsButton" onClick={handlePreview}>
          {datasetWizardStrings.previewResultsButton()}
        </EuiButton>
      )}
    </div>
  );
};
