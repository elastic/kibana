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
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  InputNumberFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED, FIELD_MIN_VALUE, FIELD_MAX_VALUE } from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

const { emptyField } = fieldValidators;

type InputNumberProps = z.infer<typeof InputNumberFieldSchema> & ConditionRenderProps;

export const InputNumber = ({ label, name, type, isRequired, min, max }: InputNumberProps) => {
  const validations = [];

  if (isRequired) {
    validations.push({ validator: emptyField(FIELD_REQUIRED) });
  }

  if (min !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        const num = Number(value);
        if (!Number.isNaN(num) && num < min) {
          return { message: FIELD_MIN_VALUE(min) };
        }
      },
    });
  }

  if (max !== undefined) {
    validations.push({
      validator: ({ value }: { value: unknown }) => {
        const num = Number(value);
        if (!Number.isNaN(num) && num > max) {
          return { message: FIELD_MAX_VALUE(max) };
        }
      },
    });
  }

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`}
      component={NumericField}
      config={{ validations }}
      componentProps={{
        label,
        labelAppend: !isRequired ? OptionalFieldLabel : undefined,
      }}
    />
  );
};
InputNumber.displayName = 'InputNumber';
