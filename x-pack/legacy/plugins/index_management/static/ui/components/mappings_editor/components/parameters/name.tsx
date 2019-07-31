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
  const { form, errors } = field;

  // All validation messages, except name conflict
  const errorMessagesField = errors
    .filter(err => err.code !== ERROR_CODES.NAME_CONFLICT)
    .map(e => e.message as string)
    .join(', ');

  // Name conflict error message
  const errorMessagesNameConflict = field.getErrorsMessages({
    errorCode: ERROR_CODES.NAME_CONFLICT,
  });

  const isInvalid = field.errors.length
    ? form.isSubmitted || errorMessagesNameConflict !== null
    : false;

  // Concatenate error messages.
  const errorMessage: string | null =
    errorMessagesField && errorMessagesNameConflict
      ? `${errorMessagesField}, ${errorMessagesNameConflict}`
      : errorMessagesField
      ? errorMessagesField
      : errorMessagesNameConflict;

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
