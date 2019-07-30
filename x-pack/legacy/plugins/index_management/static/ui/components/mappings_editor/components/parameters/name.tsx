/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

import { Field as FieldType } from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import { ERROR_CODES } from '../../constants';

interface Props {
  field: FieldType;
  fieldProps?: Record<string, any>;
}

export const Name = ({ field, fieldProps = {} }: Props) => {
  // Errors for field
  const errorMessageField = field.form.isSubmitted ? field.getErrorsMessages() : null;

  // Errors of name conflict
  const errorMessageNameConflict = field.getErrorsMessages({
    errorCode: ERROR_CODES.NAME_CONFLICT,
  });

  const isInvalid = field.errors.length
    ? field.form.isSubmitted || errorMessageNameConflict !== null
    : false;

  // Concatenate error messages.
  const errorMessage: string | null =
    errorMessageField && errorMessageNameConflict
      ? `${errorMessageField}, ${errorMessageNameConflict}`
      : errorMessageField
      ? errorMessageField
      : errorMessageNameConflict;

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
    >
      <EuiFieldText
        isInvalid={isInvalid}
        value={field.value as string}
        onChange={field.onChange}
        isLoading={field.isValidating}
        fullWidth
        {...fieldProps}
      />
    </EuiFormRow>
  );
};
