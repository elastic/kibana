/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select/super_select_item';
import { FILTERS_FORM_ITEM_SUBJ } from '../constants';
import { alertsFiltersMetadata } from '../filters_metadata';
import type { AlertsFilterComponentType, AlertsFiltersType } from '../types';
import {
  FORM_ITEM_FILTER_BY_LABEL,
  FORM_ITEM_FILTER_BY_PLACEHOLDER,
  FORM_ITEM_OPTIONAL_CAPTION,
} from '../translations';

export interface AlertsFiltersFormItemProps<T> {
  type?: AlertsFiltersType;
  onTypeChange: (newFilterType: AlertsFiltersType) => void;
  value?: T;
  onValueChange: (newFilterValue: T) => void;
  isDisabled?: boolean;
  errors?: { type?: string; value?: string };
}

const options: Array<EuiSuperSelectOption<AlertsFiltersType>> = Object.values(
  alertsFiltersMetadata
).map((filterMeta) => ({
  value: filterMeta.id as AlertsFiltersType,
  dropdownDisplay: filterMeta.displayName,
  inputDisplay: filterMeta.displayName,
}));

export const AlertsFiltersFormItem = <T,>({
  type,
  onTypeChange,
  value,
  onValueChange,
  isDisabled = false,
  errors,
}: AlertsFiltersFormItemProps<T>) => {
  const FilterComponent = type
    ? (alertsFiltersMetadata[type].component as AlertsFilterComponentType<T>)
    : null;

  return (
    <>
      <EuiFormRow
        label={FORM_ITEM_FILTER_BY_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {FORM_ITEM_OPTIONAL_CAPTION}
          </EuiText>
        }
        fullWidth
        isDisabled={isDisabled}
        data-test-subj={FILTERS_FORM_ITEM_SUBJ}
        error={errors?.type}
        isInvalid={Boolean(errors?.type)}
      >
        <EuiSuperSelect
          options={options}
          valueOfSelected={type}
          onChange={onTypeChange}
          disabled={isDisabled}
          placeholder={FORM_ITEM_FILTER_BY_PLACEHOLDER}
          fullWidth
          compressed
          popoverProps={{
            repositionOnScroll: true,
            ownFocus: true,
          }}
        />
      </EuiFormRow>
      {FilterComponent && (
        <FilterComponent
          value={value}
          onChange={onValueChange}
          isDisabled={isDisabled}
          error={errors?.value}
        />
      )}
    </>
  );
};
