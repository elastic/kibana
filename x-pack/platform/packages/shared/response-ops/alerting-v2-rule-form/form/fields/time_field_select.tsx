/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import { EuiSelect, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '../types';
import { firstFieldOption, getTimeFieldOptions } from '../utils';
import { useDataFields } from '../hooks/use_data_fields';
import { useRuleFormServices } from '../contexts';

const PREFERRED_TIME_FIELD = '@timestamp';

export const TimeFieldSelect = () => {
  const { http, dataViews } = useRuleFormServices();
  const { control, setValue, getValues } = useFormContext<FormValues>();
  const query = useWatch({ name: 'evaluation.query.base', control });

  const handleAutoSelect = useCallback(
    (fields: DataViewFieldMap) => {
      const options = getTimeFieldOptions(fields);

      // Auto-select a time field when options load
      const currentValue = getValues('timeField');
      const isCurrentValueValid = options.some((opt) => opt.value === currentValue);

      // Only auto-select if current value is empty or invalid
      if (!currentValue || !isCurrentValueValid) {
        const preferredField = options.find((opt) => opt.value === PREFERRED_TIME_FIELD);
        const selectedField = preferredField?.value || options[0]?.value || '';

        if (selectedField) {
          setValue('timeField', selectedField);
        }
      }
    },
    [getValues, setValue]
  );

  const { data, isLoading } = useDataFields({
    query,
    http,
    dataViews,
    onSuccess: handleAutoSelect,
  });

  const timeFieldOptions = useMemo(
    () => [firstFieldOption, ...getTimeFieldOptions(data ?? {})],
    [data]
  );

  return (
    <Controller
      name="timeField"
      control={control}
      render={({ field: { value, onChange, ref }, fieldState: { error } }) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          onChange(e.target.value);
        };

        return (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.timeFieldLabel', {
              defaultMessage: 'Time Field',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiSelect
              options={timeFieldOptions}
              value={value ?? ''}
              onChange={handleChange}
              aria-label={i18n.translate('xpack.alertingV2.ruleForm.timeFieldSelect.ariaLabel', {
                defaultMessage: 'Select time field for rule execution',
              })}
              inputRef={ref}
              isInvalid={!!error}
              isLoading={isLoading}
              fullWidth
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
