/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { isEqual } from 'lodash/fp';
import { EuiFieldSearch, EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

import { FilterOptions } from '../../../../containers/case/types';
import { useGetTags } from '../../../../containers/case/use_get_tags';
import { TagsFilterPopover } from '../../../../pages/detection_engine/rules/all/rules_table_filters/tags_filter_popover';

interface Initial {
  search: string;
  tags: string[];
}
interface CasesTableFiltersProps {
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  initial: Initial;
}

/**
 * Collection of filters for filtering data within the CasesTable. Contains search bar,
 * and tag selection
 *
 * @param onFilterChanged change listener to be notified on filter changes
 */

const CasesTableFiltersComponent = ({
  onFilterChanged,
  initial = { search: '', tags: [] },
}: CasesTableFiltersProps) => {
  const [search, setSearch] = useState(initial.search);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
  const [{ isLoading, data }] = useGetTags();

  const handleSelectedTags = useCallback(
    newTags => {
      if (!isEqual(newTags, selectedTags)) {
        setSelectedTags(newTags);
        onFilterChanged({ search, tags: newTags });
      }
    },
    [search, selectedTags]
  );
  const handleOnSearch = useCallback(
    newSearch => {
      const trimSearch = newSearch.trim();
      if (!isEqual(trimSearch, search)) {
        setSearch(trimSearch);
        onFilterChanged({ tags: selectedTags, search: trimSearch });
      }
    },
    [search, selectedTags]
  );

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow={true}>
        <EuiFieldSearch
          aria-label={i18n.SEARCH_CASES}
          fullWidth
          incremental={false}
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={handleOnSearch}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <TagsFilterPopover
            isLoading={isLoading}
            onSelectedTagsChanged={handleSelectedTags}
            selectedTags={selectedTags}
            tags={data}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
