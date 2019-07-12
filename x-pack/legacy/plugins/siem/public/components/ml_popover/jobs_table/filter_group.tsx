/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore no-exported-member
  EuiSearchBar,
} from '@elastic/eui';

import { EuiSearchBarQuery } from '../../open_timeline/types';
import * as i18n from '../translations';

interface FilterGroupProps {
  showAllJobs: boolean;
  setShowAllJobs: (showAllJobs: boolean) => void;
  setFilterQuery: (filterQuery: string) => void;
}

export const FilterGroup = React.memo<FilterGroupProps>(
  ({ showAllJobs, setShowAllJobs, setFilterQuery }) => (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow={true}>
        <EuiSearchBar
          data-test-subj="jobs-filter-bar"
          box={{
            placeholder: i18n.FILTER_PLACEHOLDER,
            incremental: true,
          }}
          onChange={(query: EuiSearchBarQuery) => setFilterQuery(query.queryText.trim())}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            hasActiveFilters={!showAllJobs}
            onClick={() => setShowAllJobs(false)}
            data-test-subj="show-custom-jobs-filter-button"
          >
            {i18n.SHOW_ELASTIC_JOBS}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={showAllJobs}
            onClick={() => setShowAllJobs(true)}
            data-test-subj="show-elastic-jobs-filter-button"
          >
            {i18n.SHOW_CUSTOM_JOBS}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
