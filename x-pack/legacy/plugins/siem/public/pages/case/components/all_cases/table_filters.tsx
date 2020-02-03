/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { EuiFieldSearch, EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

import { FilterOptions } from '../../../../containers/case/types';
import { useGetTags } from '../../../../containers/case/use_get_tags';
import { TagsFilterPopover } from '../../../../pages/detection_engine/rules/all/rules_table_filters/tags_filter_popover';

interface CasesTableFiltersProps {
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
}

/**
 * Collection of filters for filtering data within the CasesTable. Contains search bar,
 * and tag selection
 *
 * @param onFilterChanged change listener to be notified on filter changes
 */
const CasesTableFiltersComponent = ({ onFilterChanged }: CasesTableFiltersProps) => {
  const [search, setSearch] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [{ isLoading, data }] = useGetTags();

  // Propagate filter changes to parent
  useEffect(() => {
    onFilterChanged({ search, tags: selectedTags });
  }, [search, selectedTags, onFilterChanged]);

  const handleOnSearch = useCallback(searchString => setSearch(searchString.trim()), [setSearch]);

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
            tags={data}
            onSelectedTagsChanged={setSelectedTags}
            isLoading={isLoading}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
