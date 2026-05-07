/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiComboBox, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DataSourceFormValues } from '../types';
import type { IndexColumn } from '../hooks/use_index_columns';
import { SectionWrapper } from './section_wrapper';
import { GroupByFields } from './group_by_fields';
import { FilterInput } from './filter_input';

interface DataSourceSectionProps {
  http: HttpStart;
  allColumns: IndexColumn[];
  isColumnsLoading: boolean;
}

export const DataSourceSection = ({
  http,
  allColumns,
  isColumnsLoading,
}: DataSourceSectionProps) => {
  const { control, watch, setValue } = useFormContext<DataSourceFormValues>();
  const indexPattern = watch('indexPattern');

  const [indexOptions, setIndexOptions] = useState<Array<{ label: string }>>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState<Array<{ value: string; text: string }>>(
    []
  );
  const [isLoadingIndices, setIsLoadingIndices] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  const fetchIndices = useCallback(
    async (searchValue: string) => {
      if (!searchValue) {
        setIndexOptions([]);
        return;
      }
      setIsLoadingIndices(true);
      try {
        const response = await http.get<{
          indices: Array<{ name: string }>;
        }>(
          `/internal/index-pattern-management/resolve_index/${encodeURIComponent(
            `${searchValue}*`
          )}`
        );
        setIndexOptions((response.indices ?? []).map((idx) => ({ label: idx.name })));
      } catch {
        setIndexOptions([]);
      } finally {
        setIsLoadingIndices(false);
      }
    },
    [http]
  );

  useEffect(() => {
    if (!indexPattern) {
      setTimeFieldOptions([]);
      return;
    }

    let cancelled = false;
    const fetchFields = async () => {
      setIsLoadingFields(true);
      try {
        const response = await http.get<{
          fields: Array<{ name: string; type: string }>;
        }>(`/internal/index-pattern-management/resolve_index/${encodeURIComponent(indexPattern)}`);
        if (!cancelled) {
          const dateFields = (response.fields ?? [])
            .filter((f: { name: string; type: string }) => f.type === 'date')
            .map((f: { name: string; type: string }) => ({ value: f.name, text: f.name }));

          if (dateFields.length === 0) {
            setTimeFieldOptions([{ value: '@timestamp', text: '@timestamp' }]);
          } else {
            setTimeFieldOptions(dateFields);
          }
        }
      } catch {
        if (!cancelled) {
          setTimeFieldOptions([{ value: '@timestamp', text: '@timestamp' }]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFields(false);
        }
      }
    };
    fetchFields();
    return () => {
      cancelled = true;
    };
  }, [indexPattern, http]);

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
                  setValue('timeField', '@timestamp');
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
              isLoading={isLoadingFields}
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
