/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { z } from '@kbn/zod/v4';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  SelectBasicFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

type SelectBasicProps = z.infer<typeof SelectBasicFieldSchema> & ConditionRenderProps;

export const SelectBasic = ({ label, metadata, name, type, isRequired }: SelectBasicProps) => {
  const { control } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;

  const options = useMemo(
    () => metadata.options.map((option) => ({ value: option, text: option })),
    [metadata.options]
  );

  const rules = useMemo(() => {
    if (!isRequired) return undefined;
    return {
      validate: {
        required: (value: unknown) =>
          typeof value === 'string' && value !== '' ? true : FIELD_REQUIRED,
      },
    };
  }, [isRequired]);

  return (
    <Controller
      key={name}
      name={path}
      control={control}
      rules={rules}
      defaultValue=""
      render={({ field, fieldState }) => (
        <EuiFormRow
          label={label}
          labelAppend={!isRequired ? OptionalFieldLabel : undefined}
          isInvalid={!!fieldState.error}
          error={fieldState.error?.message}
          fullWidth
        >
          <EuiSelect
            inputRef={field.ref}
            name={field.name}
            options={options}
            value={(field.value as string) ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            hasNoInitialSelection={!field.value}
            isInvalid={!!fieldState.error}
            fullWidth
          />
        </EuiFormRow>
      )}
    />
  );
};
SelectBasic.displayName = 'SelectBasic';
