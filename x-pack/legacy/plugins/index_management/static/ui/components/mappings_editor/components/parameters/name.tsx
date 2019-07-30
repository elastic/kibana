/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';

import {
  Field as FieldType,
  VALIDATION_TYPES,
} from '../../../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import { ERROR_CODES } from '../../constants';

interface Props {
  field: FieldType;
  fieldProps?: Record<string, any>;
}

export const Name = ({ field, fieldProps = {} }: Props) => {
  const { form, errors } = field;

  const errorMessagesField = errors
    .filter(
      err => err.validationType === VALIDATION_TYPES.FIELD && err.code !== ERROR_CODES.NAME_CONFLICT
    )
    .map(e => e.message as string)
    .join(', ');

  // Errors of name conflict
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

  const validateNameConflict = (value: string) => {
    const formData = field.form.getFormData({ unflatten: false });
    const regEx = /(.+)(\d+\.name)$/;
    const regExResult = regEx.exec(field.path);

    if (regExResult) {
      const { 1: parentPath } = regExResult;
      // Get all the "name" parameter of each property on the parent object
      const namePropertyPaths = Object.keys(formData).filter(
        key => key !== field.path && key.startsWith(parentPath) && key.endsWith('name')
      );

      // Remove any previous name conflict as we might have cleared it by changing this field name
      for (const namePath of namePropertyPaths) {
        const nameField = form.getFields()[namePath];
        const _errors = nameField.errors.filter(
          err => err.code === ERROR_CODES.NAME_CONFLICT && err.existingPath === field.path
        );

        if (_errors.length < nameField.errors.length) {
          form.setFieldErrors(namePath, _errors);
        }
      }

      // Check if the current value conflicts with other field name
      for (const namePath of namePropertyPaths) {
        if (value === formData[namePath]) {
          form.setFieldErrors(field.path, [
            {
              message: 'A field with the same name already exists.',
              existingPath: namePath,
              code: ERROR_CODES.NAME_CONFLICT,
            },
          ]);
          break;
        }
      }
    }
  };

  const onNameChange = (e: React.ChangeEvent<any>) => {
    field.onChange(e);
    validateNameConflict(e.target.value);
  };

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
        onChange={onNameChange}
        isLoading={field.isValidating}
        fullWidth
        {...fieldProps}
      />
    </EuiFormRow>
  );
};
