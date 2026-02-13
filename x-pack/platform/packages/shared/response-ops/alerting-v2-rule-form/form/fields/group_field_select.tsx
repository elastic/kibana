/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FormValues } from '../types';
import { useQueryColumns } from '../hooks/use_query_columns';

interface GroupBySelectProps {
  services: {
    data: DataPublicPluginStart;
  };
}

export const GroupFieldSelect: React.FC<GroupBySelectProps> = ({ services }) => {
  const { control, setValue, watch } = useFormContext<FormValues>();
  const query = watch('query');
  const { data: columns } = useQueryColumns({ query, search: services.data.search.search });
  const options = useMemo(
    () => columns.map((col) => ({ label: col.name, value: col.name })),
    [columns]
  );
  const columnNames = useMemo(() => new Set(columns.map((col) => col.name)), [columns]);
  const groupByRowId = 'ruleV2FormGroupByField';

  // Watch for changes to groupingKey
  const currentGroupingKey = useWatch({ control, name: 'groupingKey' });

  // When columns change, filter out any invalid selections
  useEffect(() => {
    if (currentGroupingKey && currentGroupingKey.length > 0 && columnNames.size > 0) {
      const validValues = currentGroupingKey.filter((val) => columnNames.has(val));
      if (validValues.length !== currentGroupingKey.length) {
        setValue('groupingKey', validValues);
      }
    }
  }, [columnNames, currentGroupingKey, setValue]);

  return (
    <Controller
      name="groupingKey"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));

        return (
          <EuiFormRow
            id={groupByRowId}
            label={i18n.translate('xpack.alertingV2.ruleForm.groupingKeyLabel', {
              defaultMessage: 'Group Fields',
            })}
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiComboBox
              id={groupByRowId}
              options={options}
              selectedOptions={selectedOptions}
              onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
              onCreateOption={(searchValue) => {
                field.onChange([...(field.value ?? []), searchValue]);
              }}
              isClearable={true}
              isInvalid={!!error}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
