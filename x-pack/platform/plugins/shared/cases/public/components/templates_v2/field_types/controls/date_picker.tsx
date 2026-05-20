/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { Moment } from 'moment';
import moment from 'moment-timezone';
import React, { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import {
  type DatePickerFieldSchema,
  type ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

type DatePickerProps = z.infer<typeof DatePickerFieldSchema> & ConditionRenderProps;

const toMoment = (value: unknown, isLocal: boolean): Moment | null => {
  if (!value) return null;
  if (typeof value === 'string') return isLocal ? moment(value) : moment.utc(value);
  if (moment.isMoment(value)) return value;
  return null;
};

const toIsoString = (value: unknown, isLocal: boolean): string => {
  const m = toMoment(value, isLocal);
  return m ? m.utc().toISOString() : '';
};

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  name,
  type,
  metadata,
  isRequired,
}) => {
  const { control } = useFormContext();
  const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;
  const isLocal = metadata?.timezone === 'local';

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
          error={fieldState.error?.message}
          isInvalid={!!fieldState.error}
          fullWidth
        >
          <EuiDatePicker
            selected={toMoment(field.value, isLocal)}
            onChange={(date) => {
              field.onChange(toIsoString(date, isLocal));
              field.onBlur();
            }}
            showTimeSelect={metadata?.show_time ?? false}
            utcOffset={isLocal ? undefined : 0}
            isInvalid={!!fieldState.error}
            fullWidth
          />
        </EuiFormRow>
      )}
    />
  );
};
DatePicker.displayName = 'DatePicker';
