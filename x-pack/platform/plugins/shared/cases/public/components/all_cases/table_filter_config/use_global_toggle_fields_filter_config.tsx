/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FilterOptions } from '../../../../common/ui';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { TOGGLE_FIELD_OFF_LABEL, TOGGLE_FIELD_ON_LABEL } from '../../custom_fields/translations';
import { getExtendedFieldColumnKey } from '../extended_field_columns';
import { MultiSelectFilter } from '../multi_select_filter';
import { flattenExtendedFieldKey } from '../utils';
import type { FilterChangeHandler, FilterConfig, FilterConfigRenderParams } from './types';

/**
 * On and Off are both selectable. Selecting both emits two extendedFieldFilters for the
 * same label; the server ORs same-label values, so On+Off matches any case where the
 * field is set (true or false). Labels are matched case-insensitively across global
 * and template fields that share a display label.
 */
const TOGGLE_FILTER_OPTIONS = [
  { key: 'on', label: TOGGLE_FIELD_ON_LABEL, value: 'true' },
  { key: 'off', label: TOGGLE_FIELD_OFF_LABEL, value: 'false' },
] as const;

const optionKeyToValue = (optionKey: string): string | undefined =>
  TOGGLE_FILTER_OPTIONS.find((option) => option.key === optionKey)?.value;

const valueToOptionKey = (value: string): string | undefined =>
  TOGGLE_FILTER_OPTIONS.find((option) => option.value === value)?.key;

const clearExtendedFieldFiltersForLabel = (
  extendedFieldFilters: FilterOptions['extendedFieldFilters'],
  label: string
): FilterOptions['extendedFieldFilters'] =>
  (extendedFieldFilters ?? []).filter((entry) => entry.label.toLowerCase() !== label.toLowerCase());

const globalToggleFilterOptionFactory = ({
  field,
  onFilterOptionsChange,
  isLoading,
}: {
  field: InlineField;
  onFilterOptionsChange: FilterChangeHandler;
  isLoading: boolean;
}): FilterConfig => {
  const buttonLabel = field.label ?? field.name;
  const columnKey = getExtendedFieldColumnKey(field);
  const filterKey = flattenExtendedFieldKey(columnKey);

  return {
    key: filterKey,
    isActive: false,
    isAvailable: true,
    label: buttonLabel,
    getEmptyOptions: (filterOptions) => ({
      extendedFieldFilters: clearExtendedFieldFiltersForLabel(
        filterOptions.extendedFieldFilters,
        buttonLabel
      ),
    }),
    render: ({ filterOptions }: FilterConfigRenderParams) => {
      const selectedOptionKeys = (filterOptions.extendedFieldFilters ?? [])
        .filter((entry) => entry.label.toLowerCase() === buttonLabel.toLowerCase())
        .map((entry) => valueToOptionKey(entry.value))
        .filter((key): key is string => key != null);

      const onToggleFieldChange = ({
        selectedOptionKeys: nextOptionKeys,
      }: {
        filterId: string;
        selectedOptionKeys: string[];
      }) => {
        const withoutThisLabel = clearExtendedFieldFiltersForLabel(
          filterOptions.extendedFieldFilters,
          buttonLabel
        );
        const nextEntries = nextOptionKeys.flatMap((optionKey) => {
          const value = optionKeyToValue(optionKey);
          return value != null ? [{ label: buttonLabel, value }] : [];
        });

        onFilterOptionsChange({
          extendedFieldFilters: [...withoutThisLabel, ...nextEntries],
        });
      };

      return (
        <MultiSelectFilter
          buttonLabel={buttonLabel}
          id={filterKey}
          onChange={onToggleFieldChange}
          options={TOGGLE_FILTER_OPTIONS.map(({ key, label }) => ({ key, label }))}
          selectedOptionKeys={selectedOptionKeys}
          isLoading={isLoading}
        />
      );
    },
  };
};

export const useGlobalToggleFieldsFilterConfig = ({
  isSelectorView,
  globalInlineFields,
  isLoading,
  onFilterOptionsChange,
}: {
  isSelectorView: boolean;
  globalInlineFields: InlineField[];
  isLoading: boolean;
  onFilterOptionsChange: FilterChangeHandler;
}): { globalToggleFieldsFilterConfig: FilterConfig[] } => {
  if (isSelectorView) {
    return { globalToggleFieldsFilterConfig: [] };
  }

  const globalToggleFieldsFilterConfig = (globalInlineFields ?? [])
    .filter((field) => field.control === FieldType.TOGGLE)
    .map((field) =>
      globalToggleFilterOptionFactory({
        field,
        onFilterOptionsChange,
        isLoading,
      })
    );

  return { globalToggleFieldsFilterConfig };
};
