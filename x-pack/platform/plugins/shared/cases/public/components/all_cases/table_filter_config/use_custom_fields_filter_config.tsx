/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CasesConfigurationUI } from '../../../../common/ui';
import type { CustomFieldTypes } from '../../../../common/types/domain';
import { builderMap as customFieldsBuilder } from '../../custom_fields/builder';
import type { FilterChangeHandler, FilterConfig, FilterConfigRenderParams } from './types';
import { MultiSelectFilter } from '../multi_select_filter';
import { deflattenCustomFieldKey, flattenCustomFieldKey } from '../utils';

interface CustomFieldFilterOptionFactoryProps {
  buttonLabel: string;
  customFieldOptions: Array<{ key: string; label: string }>;
  fieldKey: string;
  onFilterOptionsChange: FilterChangeHandler;
  type: CustomFieldTypes;
  isLoading: boolean;
}
const customFieldFilterOptionFactory = ({
  buttonLabel,
  customFieldOptions,
  fieldKey,
  onFilterOptionsChange,
  type,
  isLoading,
}: CustomFieldFilterOptionFactoryProps) => {
  return {
    key: flattenCustomFieldKey(fieldKey), // this prefix is set in case custom field has the same key as a system field
    isActive: false,
    isAvailable: true,
    label: buttonLabel,
    getEmptyOptions: () => {
      return {
        customFields: {
          [fieldKey]: {
            type,
            options: [],
          },
        },
      };
    },
    render: ({ filterOptions }: FilterConfigRenderParams) => {
      const onCustomFieldChange = ({
        filterId,
        selectedOptionKeys,
      }: {
        filterId: string;
        selectedOptionKeys: string[];
      }) => {
        onFilterOptionsChange({
          customFields: {
            [deflattenCustomFieldKey(filterId)]: {
              options: selectedOptionKeys,
              type,
            },
          },
        });
      };

      return (
        <MultiSelectFilter
          buttonLabel={buttonLabel}
          id={fieldKey}
          onChange={onCustomFieldChange}
          options={customFieldOptions.map((option) => ({
            key: option.key,
            label: option.label,
          }))}
          selectedOptionKeys={filterOptions.customFields[fieldKey]?.options || []}
          isLoading={isLoading}
        />
      );
    },
  };
};

export const useCustomFieldsFilterConfig = ({
  isSelectorView,
  customFields,
  isLoading,
  onFilterOptionsChange,
}: {
  isSelectorView: boolean;
  customFields: CasesConfigurationUI['customFields'];
  isLoading: boolean;
  onFilterOptionsChange: FilterChangeHandler;
}) => {
  const customFieldsFilterConfig: FilterConfig[] = [];

  if (isSelectorView) {
    return { customFieldsFilterConfig: [] };
  }

  for (const { key: fieldKey, type, label: buttonLabel } of customFields ?? []) {
    if (customFieldsBuilder[type]) {
      const { filterOptions: customFieldOptions } = customFieldsBuilder[type]();

      if (customFieldOptions) {
        customFieldsFilterConfig.push(
          customFieldFilterOptionFactory({
            buttonLabel,
            customFieldOptions,
            fieldKey,
            onFilterOptionsChange,
            type,
            isLoading,
          })
        );
      }
    }
  }

  return { customFieldsFilterConfig };
};
