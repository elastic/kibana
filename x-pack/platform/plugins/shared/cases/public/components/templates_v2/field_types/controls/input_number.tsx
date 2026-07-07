/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { InlineFieldActions } from './inline_field_actions';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  InputNumberFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED, FIELD_MIN_VALUE, FIELD_MAX_VALUE } from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

type InputNumberProps = z.infer<typeof InputNumberFieldSchema> & ConditionRenderProps;

const isEmptyNumeric = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  return false;
};

export const InputNumber = ({
  label,
  name,
  type,
  isRequired,
  min,
  max,
  onConfirm,
}: InputNumberProps) => {
  const { control, resetField } = useFormContext();
  const [isFocused, setIsFocused] = useState(false);
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;

  const rules = useMemo(() => {
    const validate: Record<string, (value: unknown) => true | string> = {};

    if (isRequired) {
      validate.required = (value) => (isEmptyNumeric(value) ? FIELD_REQUIRED : true);
    }

    if (min !== undefined) {
      validate.min = (value) => {
        if (isEmptyNumeric(value)) return true;
        const num = Number(value);
        return !Number.isNaN(num) && num < min ? FIELD_MIN_VALUE(min) : true;
      };
    }

    if (max !== undefined) {
      validate.max = (value) => {
        if (isEmptyNumeric(value)) return true;
        const num = Number(value);
        return !Number.isNaN(num) && num > max ? FIELD_MAX_VALUE(max) : true;
      };
    }

    return { validate };
  }, [isRequired, min, max]);

  const showInlineActions = isFocused && onConfirm != null;

  return (
    <Controller
      key={name}
      name={path}
      control={control}
      rules={rules}
      defaultValue=""
      render={({ field, fieldState }) => (
        <>
          <EuiFormRow
            label={label}
            labelAppend={!isRequired ? OptionalFieldLabel : undefined}
            isInvalid={!!fieldState.error}
            error={fieldState.error?.message}
            fullWidth
          >
            <EuiFieldNumber
              inputRef={field.ref}
              name={field.name}
              value={(field.value as string | number | undefined) ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={() => {
                field.onBlur();
                setIsFocused(false);
              }}
              onFocus={() => setIsFocused(true)}
              isInvalid={!!fieldState.error}
              fullWidth
            />
          </EuiFormRow>
          {showInlineActions && (
            <InlineFieldActions
              name={name}
              onConfirm={() => {
                setIsFocused(false);
                onConfirm();
              }}
              onCancel={() => {
                setIsFocused(false);
                resetField(path);
              }}
            />
          )}
        </>
      )}
    />
  );
};
InputNumber.displayName = 'InputNumber';
