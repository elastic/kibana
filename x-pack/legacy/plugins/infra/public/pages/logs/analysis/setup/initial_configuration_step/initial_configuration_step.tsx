/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiForm, EuiCallOut, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { AnalysisSetupIndicesForm, IndicesSelection } from './analysis_setup_indices_form';
import { AnalysisSetupTimerangeForm } from './analysis_setup_timerange_form';
import { ValidationIndicesUIError } from '../../../../../containers/logs/log_analysis/log_analysis_setup_state';

interface InitialConfigurationStepProps {
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
  selectedIndices: IndicesSelection;
  setSelectedIndices: (selectedIndices: IndicesSelection) => void;
  validationErrors?: ValidationIndicesUIError[];
}

export const InitialConfigurationStep: React.FunctionComponent<InitialConfigurationStepProps> = ({
  setStartTime,
  setEndTime,
  startTime,
  endTime,
  selectedIndices,
  setSelectedIndices,
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
          indices={selectedIndices}
          onChangeSelectedIndices={setSelectedIndices}
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

const ValidationErrors: React.FC<{ errors: ValidationIndicesUIError[] }> = ({ errors }) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut color="danger" iconType="alert" title={errorCalloutTitle}>
        <ul>
          {errors.map((error, i) => (
            <li key={i}>{errorToI18n(error)}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};

function errorToI18n(error: ValidationIndicesUIError): React.ReactNode {
  switch (error.error) {
    case 'TOO_FEW_SELECTED_INDICES':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionTooFewSelectedIndicesDescription"
          defaultMessage="Select at least one index name."
        />
      );
    case 'INDEX_NOT_FOUND':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionIndexNotFound"
          defaultMessage="No indices match the pattern {index}"
          values={{ index: <EuiCode>{error.index}</EuiCode> }}
        />
      );
    case 'TIMESTAMP_NOT_FOUND':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionNoTimestampField"
          defaultMessage="At least one index matching {index} lacks a field called {timestamp}. Go to settings and ensure the Timestamp field value is correct."
          values={{
            index: <EuiCode>{error.index}</EuiCode>,
            timestamp: <EuiCode>{error.timestampField}</EuiCode>,
          }}
        />
      );

    case 'TIMESTAMP_NOT_VALID':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionTimestampNotValid"
          defaultMessage="At least one index matching {index} has a field called {timestamp} which is not a date field. Go to settings and ensure the Timestamp field value is correct."
          values={{
            index: <EuiCode>{error.index}</EuiCode>,
            timestamp: <EuiCode>{error.timestampField}</EuiCode>,
          }}
        />
      );

    default:
      return '';
  }
}
