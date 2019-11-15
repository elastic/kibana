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

export type IndicesSelection = Record<string, boolean>;

export const AnalysisSetupIndicesForm: React.FunctionComponent<{
  indices: IndicesSelection;
  isValidating: boolean;
  onChangeSelectedIndices: (selectedIndices: IndicesSelection) => void;
  valid: boolean;
}> = ({ indices, isValidating, onChangeSelectedIndices, valid }) => {
  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeSelectedIndices({
        ...indices,
        [event.currentTarget.id]: event.currentTarget.checked,
      });
    },
    [indices, onChangeSelectedIndices]
  );

  const choices = useMemo(
    () =>
      Object.keys(indices).map(indexName => (
        <EuiCheckbox
          key={indexName}
          id={indexName}
          label={<EuiCode>{indexName}</EuiCode>}
          onChange={handleCheckboxChange}
          checked={indices[indexName]}
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
