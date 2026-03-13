/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  InputTextFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';

const { emptyField } = fieldValidators;

type InputTextProps = z.infer<typeof InputTextFieldSchema> & ConditionRenderProps;

export const InputText = ({
  label,
  name,
  type,
  isRequired,
  patternValidation,
  minLength,
  maxLength,
}: InputTextProps) => {
  const validations = [];

  if (isRequired) {
    validations.push({ validator: emptyField('Required') });
  }

  if (patternValidation) {
    const { regex, message } = patternValidation;
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        if (typeof value !== 'string' || value === '') return;
        if (!new RegExp(regex).test(value)) {
          return { message: message ?? `Value does not match pattern: ${regex}` };
        }
      },
    });
  }

  if (minLength !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        if (typeof value === 'string' && value.length < minLength) {
          return { message: `Must be at least ${minLength} characters` };
        }
      },
    });
  }

  if (maxLength !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        if (typeof value === 'string' && value.length > maxLength) {
          return { message: `Must be at most ${maxLength} characters` };
        }
      },
    });
  }

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      component={TextField}
      config={{ validations }}
      componentProps={{
        label,
      }}
    />
  );
};
InputText.displayName = 'InputText';
