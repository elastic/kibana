/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { EuiFilterButton, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  filter,
  SelectableFilterPopover,
  StandardFilterOption,
  useFieldQueryFilter,
} from '@kbn/content-list-toolbar';
import { EventType } from '../../analytics/constants';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { TASK_TYPE_FILTERS } from '../../utils/eis_utils';
import { EIS_CATEGORY_FILTER_ID, EIS_PROVIDER_FILTER_ID } from '../../utils/eis_content_list_utils';

interface FilterControlProps {
  query?: Query;
  onChange?: (query: Query) => void;
}

const MODEL_FAMILY_FILTER_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.modelFamilyFilter.buttonLabel',
  { defaultMessage: 'Model provider' }
);

const ModelFamilyOptionsContext = createContext<Array<{ key: string; label: string }>>([]);

export const ModelFamilyOptionsProvider = ModelFamilyOptionsContext.Provider;

const ModelFamilyFilterControl = ({ query, onChange }: FilterControlProps) => {
  const options = useContext(ModelFamilyOptionsContext);
  const usageTracker = useUsageTracker();

  return (
    <SelectableFilterPopover
      fieldName={EIS_PROVIDER_FILTER_ID}
      title={MODEL_FAMILY_FILTER_TITLE}
      query={query}
      onChange={(nextQuery) => {
        usageTracker.count([
          EventType.FILTER_APPLIED,
          `${EventType.FILTER_APPLIED}_modelFamilyFilterMultiselect`,
        ]);
        onChange?.(nextQuery);
      }}
      options={options}
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
