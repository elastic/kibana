/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { Moment } from 'moment';
import moment from 'moment-timezone';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import React from 'react';
import { EuiDatePicker, EuiFormRow } from '@elastic/eui';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import {
  type DatePickerFieldSchema,
  type ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';

type DatePickerProps = z.infer<typeof DatePickerFieldSchema> & ConditionRenderProps;

const { emptyField } = fieldValidators;

const toMoment = (value: unknown, isLocal: boolean): Moment | null => {
  if (!value) return null;
  if (typeof value === 'string') return isLocal ? moment(value) : moment.utc(value);
  if (moment.isMoment(value)) return value;
  return null;
};

const makeSerializer =
  (isLocal: boolean) =>
  (value: unknown): string => {
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
  const isLocal = metadata?.timezone === 'local';
  const serializer = makeSerializer(isLocal);

  const validations = isRequired ? [{ validator: emptyField(FIELD_REQUIRED) }] : [];

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      serializer={serializer}
      config={{ validations }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow label={label} error={errorMessage} isInvalid={isInvalid} fullWidth>
            <EuiDatePicker
              selected={toMoment(field.value, isLocal)}
              onChange={(date) => field.setValue(date)}
              showTimeSelect={metadata?.show_time ?? false}
              utcOffset={isLocal ? undefined : 0}
              isInvalid={isInvalid}
              fullWidth
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
DatePicker.displayName = 'DatePicker';
