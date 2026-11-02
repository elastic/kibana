/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { useEuiTheme, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { filter, SelectableFilterPopover, StandardFilterOption } from '@kbn/content-list-toolbar';
import type { RegionOption } from '../../types';
import { EIS_REGION_FILTER_ID } from '../../utils/eis_content_list_utils';

interface FilterControlProps {
  query?: Query;
  onChange?: (query: Query) => void;
}

const RegionOptionsContext = createContext<RegionOption[]>([]);

export const RegionOptionsProvider = RegionOptionsContext.Provider;

const RegionFilterControl = ({ query, onChange }: FilterControlProps) => {
  const options = useContext(RegionOptionsContext);
  const { euiTheme } = useEuiTheme();

  return (
    <SelectableFilterPopover
      panelMinWidth={euiTheme.base * 25}
      fieldName={EIS_REGION_FILTER_ID}
      title={i18n.translate('xpack.searchInferenceEndpoints.regionFilter.buttonLabel', {
        defaultMessage: 'Region',
      })}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption
          isActive={isActive}
          data-test-subj={`regionFilterOption-${option.key}`}
        >
          {option.label}
        </StandardFilterOption>
      )}
      data-test-subj="regionFilterMultiselect"
    />
  );
};

export const RegionFilterPart = filter.createComponent({
  resolve: () => ({ type: 'custom_component' as const, component: RegionFilterControl }),
});
