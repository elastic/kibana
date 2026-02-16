/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { HttpStart } from '@kbn/core/public';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import { EuiSelect, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '../types';
import { firstFieldOption, getTimeFieldOptions } from '../../flyout/utils';
import { useDataFields } from '../hooks/use_data_fields';

const PREFERRED_TIME_FIELD = '@timestamp';

interface TimeFieldSelectProps {
  services: {
    http: HttpStart;
    dataViews: DataViewsPublicPluginStart;
  };
}

export const TimeFieldSelect: React.FC<TimeFieldSelectProps> = ({ services }) => {
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const { control, setValue, getValues } = useFormContext<FormValues>();
  const query = useWatch({ name: 'evaluation.query.base', control });

  const handleFieldsSuccess = useCallback(
    (fields: DataViewFieldMap) => {
      const newTimeFieldOptions = getTimeFieldOptions(fields);
      setTimeFieldOptions([firstFieldOption, ...newTimeFieldOptions]);

      // Auto-select a time field when options load
      const currentValue = getValues('timeField');
      const isCurrentValueValid = newTimeFieldOptions.some((opt) => opt.value === currentValue);

      // Only auto-select if current value is empty or invalid
      if (!currentValue || !isCurrentValueValid) {
        const preferredField = newTimeFieldOptions.find(
          (opt) => opt.value === PREFERRED_TIME_FIELD
        );
        const selectedField = preferredField?.value || newTimeFieldOptions[0]?.value || '';

        if (selectedField) {
          setValue('timeField', selectedField);
        }
      }
    },
    [getValues, setValue]
  );

  const { isLoading } = useDataFields({
    query,
    http: services.http,
    dataViews: services.dataViews,
    onSuccess: handleFieldsSuccess,
  });

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
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
