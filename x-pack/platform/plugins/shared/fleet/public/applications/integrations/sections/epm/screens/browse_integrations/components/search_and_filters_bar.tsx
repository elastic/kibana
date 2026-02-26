/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';

import { useUrlFilters, useAddUrlFilters } from '../hooks/url_filters';
import type { BrowseIntegrationSortType, IntegrationStatusFilterType } from '../types';
import { StatusFilter } from '../../../components/status_filter';

const SEARCH_DEBOUNCE_MS = 150;

export const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  background-color: ${(props) => props.theme.euiTheme.colors.backgroundBasePlain};
  z-index: ${(props) => props.theme.euiTheme.levels.menu};
  top: var(--kbn-application--sticky-headers-offset, var(--kbn-layout--header-height, '0px'));
  padding-top: ${(props) => props.theme.euiTheme.size.m};
`;

const SortFilter: React.FC = () => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const options = useMemo(
    () => [
      // TODO enabled when supported
      // {
      //   label: i18n.translate(
      //     'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByRecentOldOption',
      //     {
      //       defaultMessage: 'Recent-Old',
      //     }
      //   ),
      //   key: 'recent-old',
      // },
      // {
      //   label: i18n.translate(
      //     'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByOldRecentOption',
      //     {
      //       defaultMessage: 'Old-Recent',
      //     }
      //   ),
      //   key: 'old-recent',
      // },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByAZOption',
          {
            defaultMessage: 'A-Z',
          }
        ),
        key: 'a-z',
        'data-test-subj': 'browseIntegrations.searchBar.sortByAZOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByZAOption',
          {
            defaultMessage: 'Z-A',
          }
        ),
        key: 'z-a',
        'data-test-subj': 'browseIntegrations.searchBar.sortByZAOption',
      },
    ],
    []
  );

  const selectedOption = useMemo(() => {
    if (!urlFilters.sort) {
      return options[0];
    }

    return options.find((option) => option.key === urlFilters.sort) ?? options[0];
  }, [urlFilters.sort, options]);

  return (
    <EuiFilterGroup compressed>
      <EuiPopover
        id="browseIntegrationsSortPopover"
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        button={
          <EuiFilterButton
            data-test-subj="browseIntegrations.searchBar.sortBtn"
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isOpen}
          >
            {selectedOption.label}
          </EuiFilterButton>
        }
      >
        <EuiSelectable
          searchable={false}
          singleSelection={true}
          options={options}
          onChange={(newOptions) => {
            const selected = newOptions.find((option) => option.checked);
            if (selected) {
              addUrlFilters({ sort: selected.key as BrowseIntegrationSortType });
              closePopover();
            }
          }}
          listProps={{
            paddingSize: 's',
            showIcons: false,
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

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

export const SearchAndFiltersBar: React.FC = ({}) => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const handleStatusChange = useCallback(
    (statuses: IntegrationStatusFilterType[]) => {
      addUrlFilters({ status: statuses.length > 0 ? statuses : undefined });
    },
    [addUrlFilters]
  );
  return (
    <StickyFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={true}>
          <SearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton>
              <FormattedMessage
                id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.setupMethodLabel"
                defaultMessage="Setup method"
              />
            </EuiFilterButton>
            <EuiFilterButton>
              <FormattedMessage
                id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.allSignalsLabel"
                defaultMessage="All signals"
              />
            </EuiFilterButton>

            <StatusFilter
              selectedStatuses={urlFilters.status}
              onChange={handleStatusChange}
              testSubjPrefix="browseIntegrations.searchBar"
              popoverId="browseIntegrationsStatusPopover"
            />
          </EuiFilterGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SortFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </StickyFlexItem>
  );
};
