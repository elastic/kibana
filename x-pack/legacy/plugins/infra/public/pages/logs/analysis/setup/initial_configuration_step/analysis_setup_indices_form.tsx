/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiCheckbox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { ValidatedIndex } from '../../../../../containers/logs/log_analysis/log_analysis_setup_state';

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
          return index.index === checkbox.id ? { ...index, checked: checkbox.checked } : index;
        })
      );
    },
    [indices, onChangeSelectedIndices]
  );

  const choices = useMemo(
    () =>
      indices.map(index => (
        <EuiCheckbox
          key={index.index}
          id={index.index}
          label={<EuiCode>{index.index}</EuiCode>}
          onChange={handleCheckboxChange}
          checked={index.checked}
        />
      )),
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
      {isValidating ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        choices.length > 0 && (
          <EuiFormRow
            describedByIds={['indices']}
            fullWidth
            isInvalid={!valid}
            label={indicesSelectionLabel}
            labelType="legend"
          >
            <>{choices}</>
          </EuiFormRow>
        )
      )}
    </EuiDescribedFormGroup>
  );
};

const indicesSelectionLabel = i18n.translate('xpack.infra.analysisSetup.indicesSelectionLabel', {
  defaultMessage: 'Indices',
});
