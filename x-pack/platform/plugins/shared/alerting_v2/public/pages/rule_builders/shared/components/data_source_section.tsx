/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import {
  useDataFields,
  getTimeFieldOptions,
  useRuleFormServices,
} from '@kbn/alerting-v2-rule-form';
import type { DataSourceFormValues } from '../types';
import type { IndexColumn } from '../hooks/use_index_columns';
import { useIndexOptions } from '../hooks/use_index_options';
import { SectionWrapper } from './section_wrapper';
import { GroupByFields } from './group_by_fields';
import { FilterInput } from './filter_input';

const DEFAULT_TIME_FIELD = '@timestamp';

const NO_TIME_FIELDS_OPTION = {
  text: i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.noTimeFields', {
    defaultMessage: 'No time fields available',
  }),
  value: '',
};

interface DataSourceSectionProps {
  allColumns: IndexColumn[];
  isColumnsLoading: boolean;
}

export const DataSourceSection = ({ allColumns, isColumnsLoading }: DataSourceSectionProps) => {
  const { http, dataViews } = useRuleFormServices();
  const { control, setValue, getValues } = useFormContext<DataSourceFormValues>();
  const indexPattern = useWatch({ control, name: 'indexPattern' });

  const {
    options: indexOptions,
    isLoading: isLoadingIndices,
    fetchOptions: fetchIndices,
  } = useIndexOptions({ http });

  const esqlQuery = useMemo(() => (indexPattern ? `FROM ${indexPattern}` : ''), [indexPattern]);

  const handleAutoSelectTimeField = useCallback(
    (fields: DataViewFieldMap) => {
      const options = getTimeFieldOptions(fields);
      const currentValue = getValues('timeField');
      const isCurrentValueValid = options.some((opt) => opt.value === currentValue);

      if (!currentValue || !isCurrentValueValid) {
        const preferredField = options.find((opt) => opt.value === DEFAULT_TIME_FIELD);
        const selectedField = preferredField?.value || options[0]?.value || '';
        setValue('timeField', selectedField, { shouldValidate: true });
      }
    },
    [getValues, setValue]
  );

  const { data: fieldsData, isLoading: isFieldsLoading } = useDataFields({
    query: esqlQuery,
    http,
    dataViews,
    onSuccess: handleAutoSelectTimeField,
  });

  const timeFieldOptions = useMemo(() => {
    const options = getTimeFieldOptions(fieldsData ?? {});
    return options.length > 0 ? options : [NO_TIME_FIELDS_OPTION];
  }, [fieldsData]);

  return (
    <SectionWrapper
      title={i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.title', {
        defaultMessage: 'Data source',
      })}
    >
      <Controller
        name="indexPattern"
        control={control}
        rules={{
          validate: (value) => {
            if (!value || !value.trim()) {
              return i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.indexRequired', {
                defaultMessage: 'Index pattern is required.',
              });
            }
            return true;
          },
        }}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.indexLabel', {
              defaultMessage: 'Index pattern',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              selectedOptions={field.value ? [{ label: field.value }] : []}
              onSearchChange={fetchIndices}
              onChange={(options) => {
                const value = options.length > 0 ? options[0].label : '';
                field.onChange(value);
                if (!value) {
                  setValue('timeField', DEFAULT_TIME_FIELD);
                }
              }}
              onCreateOption={(value) => {
                const trimmed = value.trim();
                if (trimmed) {
                  field.onChange(trimmed);
                }
              }}
              options={indexOptions}
              isLoading={isLoadingIndices}
              fullWidth
              isInvalid={!!error}
              data-test-subj="dataSourceIndexPattern"
            />
          </EuiFormRow>
        )}
      />
      <EuiSpacer size="m" />
      <Controller
        name="timeField"
        control={control}
        rules={{
          required: i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.timeFieldRequired', {
            defaultMessage: 'Time field is required.',
          }),
        }}
        render={({ field: { value, onChange, ref }, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.timeFieldLabel', {
              defaultMessage: 'Time field',
            })}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiSelect
              isInvalid={!!error}
              options={timeFieldOptions}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              inputRef={ref}
              isLoading={isFieldsLoading}
              fullWidth
              aria-label={i18n.translate(
                'xpack.alertingV2.ruleBuilder.dataSource.timeFieldAriaLabel',
                { defaultMessage: 'Select time field' }
              )}
              data-test-subj="dataSourceTimeField"
            />
          </EuiFormRow>
        )}
      />
      <EuiSpacer size="m" />
      <GroupByFields columns={allColumns} isLoading={isColumnsLoading} />
      <EuiSpacer size="m" />
      <Controller
        name="filterQuery"
        control={control}
        render={({ field: { value, onChange, onBlur } }) => (
          <FilterInput
            value={value ?? ''}
            onChange={onChange}
            onBlur={onBlur}
            label={i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.filterLabel', {
              defaultMessage: 'Filter',
            })}
            helpText={i18n.translate('xpack.alertingV2.ruleBuilder.dataSource.filterHelpText', {
              defaultMessage: 'An ES|QL expression applied to all data before aggregation.',
            })}
            data-test-subj="dataSourceGlobalFilter"
          />
        )}
      />
    </SectionWrapper>
  );
};
