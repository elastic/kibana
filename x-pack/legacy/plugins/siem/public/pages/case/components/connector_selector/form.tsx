/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback } from 'react';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';
import { Connector } from '../../../../../../../../plugins/case/common/api/cases';

interface ConnectorSelectorProps {
  connectors: Connector[];
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  disabled: boolean;
  isLoading: boolean;
}
export const ConnectorSelector = ({
  connectors,
  dataTestSubj,
  field,
  idAria,
  disabled = false,
  isLoading = false,
}: ConnectorSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const handleContentChange = useCallback(
    (newContent: string) => {
      console.log('newContent', newContent);
      field.setValue(newContent);
    },
    [field]
  );

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={field.helpText}
      isInvalid={isInvalid}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <ConnectorsDropdown
        connectors={connectors}
        selectedConnector={field.value as string}
        disabled={disabled}
        isLoading={isLoading}
        onChange={handleContentChange}
      />
    </EuiFormRow>
  );
};
