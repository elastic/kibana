/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { PROFILE_NAME_HELP, PROFILE_NAME_LABEL } from '../../translations';

interface SaveAsNewFormProps {
  name: string;
  onNameChange: (name: string) => void;
  error?: string;
  isDisabled: boolean;
  onSubmit: () => void;
}

// A stable callback ref, so the field takes the focus once, when the step opens.
const focusOnMount = (element: HTMLInputElement | null) => element?.focus();

export const SaveAsNewForm = ({
  name,
  onNameChange,
  error,
  isDisabled,
  onSubmit,
}: SaveAsNewFormProps) => (
  <EuiForm
    component="form"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
    data-test-subj="searchBoostSaveAsNewForm"
  >
    <EuiFormRow
      label={PROFILE_NAME_LABEL}
      helpText={PROFILE_NAME_HELP}
      isInvalid={Boolean(error)}
      error={error}
      fullWidth
    >
      <EuiFieldText
        value={name}
        onChange={({ target: { value } }) => onNameChange(value)}
        isInvalid={Boolean(error)}
        disabled={isDisabled}
        fullWidth
        inputRef={focusOnMount}
        data-test-subj="searchBoostSaveAsNewName"
      />
    </EuiFormRow>
  </EuiForm>
);
