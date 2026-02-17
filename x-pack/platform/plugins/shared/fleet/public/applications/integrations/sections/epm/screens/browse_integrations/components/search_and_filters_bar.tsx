/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import useDebounce from 'react-use/lib/useDebounce';

import { useUrlFilters, useAddUrlFilters } from '../hooks/url_filters';

const SEARCH_DEBOUNCE_MS = 150;

export const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  background-color: ${(props) => props.theme.euiTheme.colors.backgroundBasePlain};
  z-index: ${(props) => props.theme.euiTheme.levels.menu};
  top: var(--kbn-application--sticky-headers-offset, var(--kbn-layout--header-height, '0px'));
  padding-top: ${(props) => props.theme.euiTheme.size.m};
`;

const SearchBar: React.FC = () => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const [searchTerms, setSearchTerms] = useState(urlFilters.q);

  useDebounce(
    () => {
      addUrlFilters(
        {
          q: searchTerms,
        },
        { replace: true }
      );
    },
    SEARCH_DEBOUNCE_MS,
    [searchTerms]
  );

  return (
    <EuiFieldSearch
      compressed
      placeholder={i18n.translate(
        'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.searchPlaceholder',
        {
          defaultMessage: 'Search integrations',
        }
      )}
      value={searchTerms}
      data-test-subj="browseIntegrations.searchBar.input"
      onChange={(e) => setSearchTerms(e.target.value)}
      fullWidth
    />
  );
};

export const SearchAndFiltersBar: React.FC<{ actions?: React.ReactNode }> = ({ actions }) => {
  return (
    <StickyFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={true}>
          <SearchBar />
        </EuiFlexItem>
        {actions && <EuiFlexItem grow={false}>{actions}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </StickyFlexItem>
  );
};
