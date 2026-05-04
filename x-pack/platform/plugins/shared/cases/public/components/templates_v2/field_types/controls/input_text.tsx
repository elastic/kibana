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
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  InputTextFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import {
  FIELD_REQUIRED,
  FIELD_MIN_LENGTH,
  FIELD_MAX_LENGTH,
  FIELD_PATTERN_MISMATCH,
  FIELD_PATTERN_INVALID,
} from '../../translations';

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
    validations.push({ validator: emptyField(FIELD_REQUIRED) });
  }

  if (patternValidation) {
    const { regex, message } = patternValidation;
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        if (typeof value !== 'string' || value === '') return;
        try {
          if (!new RegExp(regex).test(value)) {
            return { message: message ?? FIELD_PATTERN_MISMATCH(regex) };
          }
        } catch {
          return { message: FIELD_PATTERN_INVALID };
        }
      },
    });
  }

  if (minLength !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        if (typeof value === 'string' && value.length < minLength) {
          return { message: FIELD_MIN_LENGTH(minLength) };
        }
      },
    });
  }

  if (maxLength !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        if (typeof value === 'string' && value.length > maxLength) {
          return { message: FIELD_MAX_LENGTH(maxLength) };
        }
      },
    });
  }

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`}
      component={TextField}
      config={{ validations }}
      componentProps={{
        label,
      }}
    />
  );
};
InputText.displayName = 'InputText';
