/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { isEqual } from 'lodash/fp';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import * as i18n from './translations';

import { FilterOptions } from '../../../../containers/case/types';
import { useGetTags } from '../../../../containers/case/use_get_tags';
import { FilterPopover } from '../../../../components/filter_popover';

interface CasesTableFiltersProps {
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  initial: FilterOptions;
}

/**
 * Collection of filters for filtering data within the CasesTable. Contains search bar,
 * and tag selection
 *
 * @param onFilterChanged change listener to be notified on filter changes
 */

const CasesTableFiltersComponent = ({
  onFilterChanged,
  initial = { search: '', tags: [], state: 'open' },
}: CasesTableFiltersProps) => {
  const [search, setSearch] = useState(initial.search);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
  const [showOpenCases, setShowOpenCases] = useState(initial.state === 'open');
  const [{ data }] = useGetTags();

  const handleSelectedTags = useCallback(
    newTags => {
      if (!isEqual(newTags, selectedTags)) {
        setSelectedTags(newTags);
        onFilterChanged({ tags: newTags });
      }
    },
    [search, selectedTags]
  );
  const handleOnSearch = useCallback(
    newSearch => {
      const trimSearch = newSearch.trim();
      if (!isEqual(trimSearch, search)) {
        setSearch(trimSearch);
        onFilterChanged({ search: trimSearch });
      }
    },
    [search, selectedTags]
  );
  const handleToggleFilter = useCallback(
    showOpen => {
      if (showOpen !== showOpenCases) {
        setShowOpenCases(showOpen);
        onFilterChanged({ state: showOpen ? 'open' : 'closed' });
      }
    },
    [showOpenCases]
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
          <EuiFilterButton
            withNext
            hasActiveFilters={showOpenCases}
            onClick={handleToggleFilter.bind(null, true)}
          >
            {i18n.OPEN_CASES}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={!showOpenCases}
            onClick={handleToggleFilter.bind(null, false)}
          >
            {i18n.CLOSED_CASES}
          </EuiFilterButton>
          <FilterPopover
            buttonLabel={i18n.REPORTER}
            onSelectedOptionsChanged={() => {}}
            selectedOptions={[]}
            options={[]}
            optionsEmptyLabel={i18n.NO_REPORTERS_AVAILABLE}
          />
          <FilterPopover
            buttonLabel={i18n.TAGS}
            onSelectedOptionsChanged={handleSelectedTags}
            selectedOptions={selectedTags}
            options={data}
            optionsEmptyLabel={i18n.NO_TAGS_AVAILABLE}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
