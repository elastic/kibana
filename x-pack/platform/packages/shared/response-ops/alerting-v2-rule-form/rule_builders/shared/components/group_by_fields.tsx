/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataSourceFormValues } from '../types';
import type { IndexColumn } from '../hooks/use_index_columns';

interface GroupByFieldsProps {
  columns: IndexColumn[];
  isLoading: boolean;
}

export const GroupByFields = ({ columns, isLoading }: GroupByFieldsProps) => {
  const { control, setValue, getValues } = useFormContext<DataSourceFormValues>();

  const handleColumnsChange = useCallback(
    (cols: IndexColumn[]) => {
      const validNames = new Set(cols.map((c) => c.name));
      const currentFields = getValues('groupBy') ?? [];
      if (currentFields.length > 0 && validNames.size > 0) {
        const validFields = currentFields.filter((val) => validNames.has(val));
        if (validFields.length !== currentFields.length) {
          setValue('groupBy', validFields);
        }
      }
    },
    [getValues, setValue]
  );

  const onColumnsChangeRef = useRef(handleColumnsChange);
  onColumnsChangeRef.current = handleColumnsChange;

  useEffect(() => {
    if (columns.length > 0) {
      onColumnsChangeRef.current(columns);
    }
  }, [columns]);

  const options = useMemo(
    () => columns.map((col) => ({ label: col.name, value: col.name })),
    [columns]
  );

  return (
    <Controller
      name="groupBy"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));

        return (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleBuilder.groupBy.label', {
              defaultMessage: 'Group fields',
            })}
            labelAppend={i18n.translate('xpack.alertingV2.ruleBuilder.groupBy.optional', {
              defaultMessage: 'optional',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiComboBox
              options={options}
              selectedOptions={selectedOptions}
              onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
              onCreateOption={(searchValue) => {
                const trimmed = searchValue.trim();
                if (trimmed) {
                  field.onChange([...(field.value ?? []), trimmed]);
                }
              }}
              isClearable
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
