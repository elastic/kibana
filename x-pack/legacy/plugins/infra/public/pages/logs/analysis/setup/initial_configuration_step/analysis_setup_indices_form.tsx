/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckboxGroup, EuiCode, EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';

export type IndicesSelection = Record<string, boolean>;

export type IndicesValidationError = 'TOO_FEW_SELECTED_INDICES';

export const AnalysisSetupIndicesForm: React.FunctionComponent<{
  indices: IndicesSelection;
  onChangeSelectedIndices: (selectedIndices: IndicesSelection) => void;
  validationErrors?: IndicesValidationError[];
}> = ({ indices, onChangeSelectedIndices, validationErrors = [] }) => {
  const choices = useMemo(
    () =>
      Object.keys(indices).map(indexName => ({
        id: indexName,
        label: <EuiCode>{indexName}</EuiCode>,
      })),
    [indices]
  );

  const handleCheckboxGroupChange = useCallback(
    indexName => {
      onChangeSelectedIndices({
        ...indices,
        [indexName]: !indices[indexName],
      });
    },
    [indices, onChangeSelectedIndices]
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
      <EuiFormRow
        describedByIds={['indices']}
        error={validationErrors.map(formatValidationError)}
        fullWidth
        isInvalid={validationErrors.length > 0}
        label={indicesSelectionLabel}
        labelType="legend"
      >
        <EuiCheckboxGroup
          options={choices}
          idToSelectedMap={indices}
          onChange={handleCheckboxGroupChange}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

const indicesSelectionLabel = i18n.translate('xpack.infra.analysisSetup.indicesSelectionLabel', {
  defaultMessage: 'Indices',
});

const formatValidationError = (validationError: IndicesValidationError) => {
  switch (validationError) {
    case 'TOO_FEW_SELECTED_INDICES':
      return i18n.translate(
        'xpack.infra.analysisSetup.indicesSelectionTooFewSelectedIndicesDescription',
        {
          defaultMessage: 'Select at least one index name.',
        }
      );
  }
};
