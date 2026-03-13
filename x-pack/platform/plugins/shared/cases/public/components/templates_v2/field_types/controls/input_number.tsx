/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type {
  InputNumberFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';

const { emptyField } = fieldValidators;

type InputNumberProps = z.infer<typeof InputNumberFieldSchema> & ConditionRenderProps;

export const InputNumber = ({ label, name, type, isRequired, min, max }: InputNumberProps) => {
  const validations = [];

  if (isRequired) {
    validations.push({ validator: emptyField('Required') });
  }

  if (min !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        const num = Number(value);
        if (!Number.isNaN(num) && num < min) {
          return { message: `Value must be at least ${min}` };
        }
      },
    });
  }

  if (max !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        const num = Number(value);
        if (!Number.isNaN(num) && num > max) {
          return { message: `Value must be at most ${max}` };
        }
      },
    });
  }

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      component={NumericField}
      config={{ validations }}
      componentProps={{
        label,
      }}
    />
  );
};
InputNumber.displayName = 'InputNumber';
