/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '../types';
import { useQueryColumns, type QueryColumn } from '../hooks/use_query_columns';
import { useRuleFormServices } from '../contexts';

export const GroupFieldSelect: React.FC = () => {
  const { data } = useRuleFormServices();
  const { control, setValue, getValues, watch } = useFormContext<FormValues>();
  const query = watch('evaluation.query.base');
  const groupByRowId = 'ruleV2FormGroupByField';

  // When columns change, filter out any invalid selections
  const handleColumnsSuccess = useCallback(
    (cols: QueryColumn[]) => {
      const validNames = new Set(cols.map((c) => c.name));
      const currentFields = getValues('grouping.fields') ?? [];
      if (currentFields.length > 0 && validNames.size > 0) {
        const validFields = currentFields.filter((val) => validNames.has(val));
        if (validFields.length !== currentFields.length) {
          setValue('grouping.fields', validFields);
        }
      }
    },
    [getValues, setValue]
  );

  const { data: columns, isLoading } = useQueryColumns({
    query,
    search: data.search.search,
    onSuccess: handleColumnsSuccess,
  });

  const options = useMemo(
    () => columns.map((col) => ({ label: col.name, value: col.name })),
    [columns]
  );

  return (
    <Controller
      name="grouping.fields"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));

        return (
          <EuiFormRow
            id={groupByRowId}
            label={i18n.translate('xpack.alertingV2.ruleForm.groupingKeyLabel', {
              defaultMessage: 'Group Fields',
            })}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiComboBox
              id={groupByRowId}
              fullWidth
              compressed={true}
              options={options}
              selectedOptions={selectedOptions}
              onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
              onCreateOption={(searchValue) => {
                field.onChange([...(field.value ?? []), searchValue]);
              }}
              isClearable={true}
              isInvalid={!!error}
              isLoading={isLoading}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
