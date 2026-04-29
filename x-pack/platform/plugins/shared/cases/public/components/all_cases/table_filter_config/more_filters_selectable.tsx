/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { MultiSelectFilterOption } from '../multi_select_filter';
import { MultiSelectFilter } from '../multi_select_filter';

export const MoreFiltersSelectable = ({
  options,
  activeFilters,
  onChange,
  isLoading,
}: {
  options: Array<MultiSelectFilterOption<string>>;
  activeFilters: string[];
  isLoading: boolean;
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <MultiSelectFilter
      buttonIconType="pencil"
      hideActiveOptionsNumber
      id="more-filters"
      onChange={onChange}
      options={options}
      selectedOptionKeys={activeFilters}
      isLoading={isLoading}
      buttonCss={css`
        margin-left: -${euiTheme.size.xs};
      `}
    />
  );
};
MoreFiltersSelectable.displayName = 'MoreFiltersSelectable';
