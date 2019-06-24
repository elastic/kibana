/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

export interface InputFieldProps<
  Value extends string = string,
  FieldElement extends HTMLInputElement = HTMLInputElement
> {
  error: React.ReactNode[];
  isInvalid: boolean;
  name: string;
  onChange?: React.ChangeEventHandler<FieldElement>;
  value?: Value;
}

export type FieldErrorMessage = string | JSX.Element;

export const createInputFieldProps = <
  Value extends string = string,
  FieldElement extends HTMLInputElement = HTMLInputElement
>({
  errors,
  name,
  onChange,
  value,
}: {
  errors: FieldErrorMessage[];
  name: string;
  onChange: (newValue: string) => void;
  value: Value;
}): InputFieldProps<Value, FieldElement> => ({
  error: errors,
  isInvalid: errors.length > 0,
  name,
  onChange: (evt: React.ChangeEvent<FieldElement>) => onChange(evt.currentTarget.value),
  value,
});

export const validateInputFieldNotEmpty = (value: string) =>
  value === ''
    ? [
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.fieldEmptyErrorMessage"
          defaultMessage="The field must not be empty"
        />,
      ]
    : [];
