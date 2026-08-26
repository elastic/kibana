/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButton, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { isEqual } from 'lodash';

import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { TestConfigurationPreviewContent } from '../test_configuration_preview';
import { TEST_CONFIGURATION_PREVIEW_ROW_COUNT } from '../test_configuration_preview_utils';

const PREVIEW_RESULTS_LOADING_MS = 600;

export interface PreviewResultsStepProps {
  values: DatasetWizardFormValues;
  isActive: boolean;
}

export const PreviewResultsStep: FunctionComponent<PreviewResultsStepProps> = ({
  values,
  isActive,
}) => {
  const [previewedValues, setPreviewedValues] = useState<DatasetWizardFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<number | undefined>();
  const wasActiveRef = useRef(isActive);

  const startPreview = useCallback(() => {
    if (loadingTimeoutRef.current !== undefined) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

    const valuesToPreview = values;
    setIsLoading(true);
    loadingTimeoutRef.current = window.setTimeout(() => {
      setPreviewedValues(valuesToPreview);
      setIsLoading(false);
      loadingTimeoutRef.current = undefined;
    }, PREVIEW_RESULTS_LOADING_MS);
  }, [values]);

  useEffect(
    () => () => {
      if (loadingTimeoutRef.current !== undefined) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current;
    wasActiveRef.current = isActive;

    if (!becameActive || previewedValues === null || isEqual(previewedValues, values)) {
      return;
    }

    startPreview();
  }, [isActive, previewedValues, startPreview, values]);

  const hasPreview = previewedValues !== null && !isLoading;

  return (
    <div data-test-subj="datasetWizardPreviewResultsStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.previewResultsTitle()}</h3>
      </EuiTitle>
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
        <EuiButton data-test-subj="datasetWizardPreviewResultsButton" onClick={startPreview}>
          {datasetWizardStrings.previewResultsButton()}
        </EuiButton>
      )}
    </div>
  );
};
