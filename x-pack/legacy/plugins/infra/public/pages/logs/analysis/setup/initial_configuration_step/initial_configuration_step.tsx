/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiForm, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { ValidationIndicesError } from '../../../../../../common/http_api';
import { AnalysisSetupIndicesForm, IndicesSelection } from './analysis_setup_indices_form';
import { AnalysisSetupTimerangeForm } from './analysis_setup_timerange_form';

export type ValidationIndicesUIError =
  | ValidationIndicesError
  | {
      error: 'TOO_FEW_SELECTED_INDICES';
    };

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

function errorToI18n(error: ValidationIndicesUIError): string {
  switch (error.error) {
    case 'TOO_FEW_SELECTED_INDICES':
      return i18n.translate(
        'xpack.infra.analysisSetup.indicesSelectionTooFewSelectedIndicesDescription',
        {
          defaultMessage: 'Select at least one index name.',
        }
      );
    case 'INDEX_NOT_FOUND':
      return i18n.translate('xpack.infra.mlValidation.noIndexFound', {
        defaultMessage: 'No indices match the pattern `{index}`',
        values: { index: error.index },
      });
    case 'TIMESTAMP_NOT_FOUND':
      return i18n.translate('xpack.infra.mlValidation.noTimestampField', {
        defaultMessage:
          'Index `{index}` has no field `{timestamp}`. Ensure the "Timestamp" field in your settings exists in all indices.',
        values: { index: error.index, timestamp: error.timestamp },
      });
    case 'TIMESTAMP_NOT_VALID':
      return i18n.translate('xpack.infra.mlValidation.invalidTimestampField', {
        defaultMessage:
          'Field `{timestamp}` in index `{index}` is not of type `date`. Ensure the "Timestamp" field in your settings has `date` type.',
        values: { index: error.index, timestamp: error.timestamp },
      });
    default:
      return '';
  }
}
