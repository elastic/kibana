/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCode, EuiDescribedFormGroup, EuiFormRow, EuiCheckbox, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import {
  ValidatedIndex,
  ValidationIndicesUIError,
} from '../../../../../containers/logs/log_analysis/log_analysis_setup_state';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

export const AnalysisSetupIndicesForm: React.FunctionComponent<{
  indices: ValidatedIndex[];
  isValidating: boolean;
  onChangeSelectedIndices: (selectedIndices: ValidatedIndex[]) => void;
  valid: boolean;
}> = ({ indices, isValidating, onChangeSelectedIndices, valid }) => {
  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeSelectedIndices(
        indices.map(index => {
          const checkbox = event.currentTarget;
          return index.index === checkbox.id ? { ...index, isSelected: checkbox.checked } : index;
        })
      );
    },
    [indices, onChangeSelectedIndices]
  );

  const choices = useMemo(
    () =>
      indices.map(index => {
        const validIndex = index.validation === undefined;
        const checkbox = (
          <EuiCheckbox
            key={index.index}
            id={index.index}
            label={<EuiCode>{index.index}</EuiCode>}
            onChange={handleCheckboxChange}
            checked={index.isSelected}
            disabled={!validIndex}
          />
        );

        return validIndex ? (
          checkbox
        ) : (
          <div>
            <EuiToolTip key={index.index} content={formatValidationError(index.validation!)}>
              {checkbox}
            </EuiToolTip>
          </div>
        );
      }),
    [indices]
  );

  return (
    <EuiDescribedFormGroup
      idAria="indices"
      title={
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionTitle"
          defaultMessage="Choose indices"
        />
      }
      description={
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionDescription"
          defaultMessage="By default, Machine Learning analyzes log messages in all log indices configured for the source. You can choose to only analyze a subset of the index names. Every selected index name must match at least one index with log entries."
        />
      }
    >
      <LoadingOverlayWrapper isLoading={isValidating}>
        <EuiFormRow
          describedByIds={['indices']}
          fullWidth
          isInvalid={!valid}
          label={indicesSelectionLabel}
          labelType="legend"
        >
          <>{choices}</>
        </EuiFormRow>
      </LoadingOverlayWrapper>
    </EuiDescribedFormGroup>
  );
};

const indicesSelectionLabel = i18n.translate('xpack.infra.analysisSetup.indicesSelectionLabel', {
  defaultMessage: 'Indices',
});

const formatValidationError = (error: ValidationIndicesUIError): React.ReactNode => {
  switch (error.error) {
    case 'INDEX_NOT_FOUND':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionIndexNotFound"
          defaultMessage="No indices match the pattern {index}"
          values={{ index: <EuiCode>{error.index}</EuiCode> }}
        />
      );

    case 'FIELD_NOT_FOUND':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionNoTimestampField"
          defaultMessage="At least one index matching {index} lacks a required field {field}."
          values={{
            index: <EuiCode>{error.index}</EuiCode>,
            field: <EuiCode>{error.field}</EuiCode>,
          }}
        />
      );

    case 'FIELD_NOT_VALID':
      return (
        <FormattedMessage
          id="xpack.infra.analysisSetup.indicesSelectionTimestampNotValid"
          defaultMessage="At least one index matching {index} has a field called {field} without the correct type."
          values={{
            index: <EuiCode>{error.index}</EuiCode>,
            field: <EuiCode>{error.field}</EuiCode>,
          }}
        />
      );

    default:
      return '';
  }
};
