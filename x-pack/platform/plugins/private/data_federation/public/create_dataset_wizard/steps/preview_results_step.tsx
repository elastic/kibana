/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiButton, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { TestConfigurationPreviewContent } from '../test_configuration_preview';
import { TEST_CONFIGURATION_PREVIEW_ROW_COUNT } from '../test_configuration_preview_utils';

const PREVIEW_RESULTS_LOADING_MS = 600;

export interface PreviewResultsStepProps {
  values: DatasetWizardFormValues;
}

export const PreviewResultsStep: FunctionComponent<PreviewResultsStepProps> = ({ values }) => {
  const configKey = useMemo(() => JSON.stringify(values), [values]);
  const [previewedConfigKey, setPreviewedConfigKey] = useState<string | null>(null);
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

  const hasPreview = previewedConfigKey === configKey && !isLoading;

  const handlePreview = () => {
    if (loadingTimeoutRef.current !== undefined) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

    setIsLoading(true);
    loadingTimeoutRef.current = window.setTimeout(() => {
      setPreviewedConfigKey(configKey);
      setIsLoading(false);
      loadingTimeoutRef.current = undefined;
    }, PREVIEW_RESULTS_LOADING_MS);
  };

  return (
    <div data-test-subj="datasetWizardPreviewResultsStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.stepPreviewResults()}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.testConfigurationPreviewDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {hasPreview ? (
        <TestConfigurationPreviewContent
          values={values}
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
