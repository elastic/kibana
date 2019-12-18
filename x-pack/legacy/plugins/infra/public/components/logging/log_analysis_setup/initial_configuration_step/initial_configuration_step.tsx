/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiForm, EuiCallOut } from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { AnalysisSetupIndicesForm } from './analysis_setup_indices_form';
import { AnalysisSetupTimerangeForm } from './analysis_setup_timerange_form';
import { ValidatedIndex, ValidationIndicesUIError } from './validation';

interface InitialConfigurationStepProps {
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
  isValidating: boolean;
  validatedIndices: ValidatedIndex[];
  setValidatedIndices: (selectedIndices: ValidatedIndex[]) => void;
  validationErrors?: ValidationIndicesUIError[];
}

export const createInitialConfigurationStep = (
  props: InitialConfigurationStepProps
): EuiContainedStepProps => ({
  title: initialConfigurationStepTitle,
  children: <InitialConfigurationStep {...props} />,
});

export const InitialConfigurationStep: React.FunctionComponent<InitialConfigurationStepProps> = ({
  setStartTime,
  setEndTime,
  startTime,
  endTime,
  isValidating,
  validatedIndices,
  setValidatedIndices,
  validationErrors = [],
}: InitialConfigurationStepProps) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiForm>
        <AnalysisSetupTimerangeForm
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
        />
        <AnalysisSetupIndicesForm
          indices={validatedIndices}
          isValidating={isValidating}
          onChangeSelectedIndices={setValidatedIndices}
          valid={validationErrors.length === 0}
        />

        <ValidationErrors errors={validationErrors} />
      </EuiForm>
    </>
  );
};

const errorCalloutTitle = i18n.translate(
  'xpack.infra.analysisSetup.steps.initialConfigurationStep.errorCalloutTitle',
  {
    defaultMessage: 'Your index configuration is not valid',
  }
);

const initialConfigurationStepTitle = i18n.translate(
  'xpack.infra.analysisSetup.configurationStepTitle',
  {
    defaultMessage: 'Configuration',
  }
);

const ValidationErrors: React.FC<{ errors: ValidationIndicesUIError[] }> = ({ errors }) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut color="danger" iconType="alert" title={errorCalloutTitle}>
        <ul>
          {errors.map((error, i) => (
            <li key={i}>{formatValidationError(error)}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};

const formatValidationError = (error: ValidationIndicesUIError): React.ReactNode => {
  switch (error.error) {
    case 'NETWORK_ERROR':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionNetworkError"
          defaultMessage="We couldn't load your index configuration"
        />
      );

    case 'TOO_FEW_SELECTED_INDICES':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionTooFewSelectedIndicesDescription"
          defaultMessage="Select at least one index name."
        />
      );

    default:
      return '';
  }
};
