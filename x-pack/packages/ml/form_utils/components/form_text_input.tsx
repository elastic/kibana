/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import type { Draft } from 'immer';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useFormField } from '../use_form_field';

import { capitalizeFirstLetter } from '../utils/capitalize_first_letter';
import type { FormSlice, State } from '../form_slice';

import type { FormTextProps } from './types';

export const FormTextInput = <FF extends string, FS extends string, VN extends string>({
  slice,
  field,
  label,
  helpText,
  placeHolder = false,
}: FormTextProps<FF, FS, VN, FormSlice<FF, FS, VN>>) => {
  const dispatch = useDispatch();
  const { defaultValue, errorMessages, value } = useFormField(slice, field);
  const upperCaseField = capitalizeFirstLetter(field as string);

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={errorMessages.length > 0}
      error={errorMessages}
    >
      <EuiFieldText
        data-test-subj={`${slice.name}${upperCaseField}Input`}
        placeholder={
          placeHolder
            ? i18n.translate('xpack.ml.formUtils.formTextInputPlaceholderText', {
                defaultMessage: 'Default: {defaultValue}',
                values: { defaultValue },
              })
            : undefined
        }
        isInvalid={errorMessages.length > 0}
        value={value}
        onChange={(e) =>
          dispatch(
            slice.actions.setFormField({
              field: field as keyof Draft<State<FF, FS, VN>>['formFields'],
              value: e.target.value,
            })
          )
        }
        aria-label={label}
      />
    </EuiFormRow>
  );
};
