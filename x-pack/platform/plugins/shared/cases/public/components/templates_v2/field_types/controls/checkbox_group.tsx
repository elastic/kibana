/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React, { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiCheckboxGroup, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  CheckboxGroupFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

type CheckboxGroupProps = z.infer<typeof CheckboxGroupFieldSchema> & ConditionRenderProps;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return toStringArray(value);
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      return toStringArray(parsed);
    } catch {
      return [];
    }
  }
  return [];
};

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
}) => {
  const { control } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;

  const options = useMemo(
    () => metadata.options.map((option) => ({ id: option, label: option })),
    [metadata.options]
  );

  const defaultValue = useMemo(() => JSON.stringify(metadata.default ?? []), [metadata.default]);

  const rules = useMemo(() => {
    if (!isRequired) return undefined;
    return {
      validate: {
        required: (value: unknown) => (toArray(value).length > 0 ? true : FIELD_REQUIRED),
      },
    };
  }, [isRequired]);

  return (
    <Controller
      key={name}
      name={path}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => {
        const selected = toArray(field.value);
        const handleChange = (id: string) => {
          const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
          field.onChange(JSON.stringify(next));
          field.onBlur();
        };

        return (
          <EuiFormRow
            label={label}
            labelAppend={!isRequired ? OptionalFieldLabel : undefined}
            error={fieldState.error?.message}
            isInvalid={!!fieldState.error}
            fullWidth
          >
            <EuiCheckboxGroup
              options={options}
              idToSelectedMap={Object.fromEntries(selected.map((id) => [id, true]))}
              onChange={handleChange}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
CheckboxGroup.displayName = 'CheckboxGroup';
