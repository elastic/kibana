/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFilterButton, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListItems } from '@kbn/content-list-provider';
import {
  filter,
  SelectableFilterPopover,
  StandardFilterOption,
  useFieldQueryFilter,
} from '@kbn/content-list-toolbar';
import { getProviderOptions, TASK_TYPE_FILTERS } from '../../utils/eis_utils';
import {
  EIS_CATEGORY_FILTER_ID,
  EIS_PROVIDER_FILTER_ID,
  toGroupedModel,
} from '../../utils/eis_content_list_utils';

interface FilterControlProps {
  query?: Query;
  onChange?: (query: Query) => void;
}

const MODEL_FAMILY_FILTER_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.modelFamilyFilter.buttonLabel',
  { defaultMessage: 'Model family' }
);

const ModelFamilyFilterControl = ({ query, onChange }: FilterControlProps) => {
  const { items } = useContentListItems();

  const options = useMemo(
    () => getProviderOptions(items.map(toGroupedModel)).map(({ key, label }) => ({ key, label })),
    [items]
  );

  return (
    <SelectableFilterPopover
      fieldName={EIS_PROVIDER_FILTER_ID}
      title={MODEL_FAMILY_FILTER_TITLE}
      {...{ query, onChange, options }}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
      )}
      data-test-subj="modelFamilyFilterMultiselect"
    />
  );
};

const TaskTypeFilterControl = ({ query, onChange }: FilterControlProps) => {
  const { getState, toggle } = useFieldQueryFilter({
    fieldName: EIS_CATEGORY_FILTER_ID,
    query,
    onChange,
  });

  return (
    <>
      {TASK_TYPE_FILTERS.map(({ category, label }, index) => {
        const isActive = getState(category) === 'include';
        return (
          <EuiFilterButton
            key={category}
            withNext={index < TASK_TYPE_FILTERS.length - 1}
            grow={false}
            hasActiveFilters={isActive}
            isSelected={isActive}
            isToggle
            onClick={() => toggle(category, 'include')}
            data-test-subj={`eisTaskTypeFilter-${category}`}
          >
            {label}
          </EuiFilterButton>
        );
      })}
    </>
  );
};

export const ModelFamilyFilterPart = filter.createComponent({
  resolve: () => ({ type: 'custom_component' as const, component: ModelFamilyFilterControl }),
});

export const TaskTypeFilterPart = filter.createComponent({
  resolve: () => ({ type: 'custom_component' as const, component: TaskTypeFilterControl }),
});
