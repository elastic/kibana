/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import type { Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { filter, SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list-toolbar';
import { EventType } from '../../analytics/constants';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { MODEL_TYPE_FILTERS } from '../../utils/eis_utils';
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

const ModelTypeFilterControl = ({ query, onChange }: FilterControlProps) => {
  return (
    <SelectableFilterPopover
      fieldName={EIS_CATEGORY_FILTER_ID}
      title={i18n.translate('xpack.searchInferenceEndpoints.modelTypeFilter.buttonLabel', {
        defaultMessage: 'Model type',
      })}
      query={query}
      onChange={onChange}
      options={MODEL_TYPE_FILTERS}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
      )}
      hideSearch
      data-test-subj="modelTypeFilterMultiselect"
    />
  );
};

export const ModelFamilyFilterPart = filter.createComponent({
  resolve: () => ({ type: 'custom_component' as const, component: ModelFamilyFilterControl }),
});

export const ModelTypeFilterPart = filter.createComponent({
  resolve: () => ({ type: 'custom_component' as const, component: ModelTypeFilterControl }),
});
