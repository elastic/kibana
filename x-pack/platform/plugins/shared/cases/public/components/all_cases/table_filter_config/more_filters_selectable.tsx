/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { MultiSelectFilterOption } from '../multi_select_filter';
import { MultiSelectFilter } from '../multi_select_filter';
import { MORE_FILTERS_LABEL } from '../translations';

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
  return (
    <MultiSelectFilter
      buttonLabel={MORE_FILTERS_LABEL}
      buttonIconType="plus"
      hideActiveOptionsNumber
      id="filters"
      onChange={onChange}
      options={options}
      selectedOptionKeys={activeFilters}
      transparentBackground={true}
      isLoading={isLoading}
    />
  );
};
MoreFiltersSelectable.displayName = 'MoreFiltersSelectable';
