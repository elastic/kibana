/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFilterGroup,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OpenTimelineProps } from '../types';

import * as i18n from '../translations';

const ShowingContainer = styled.div`
  user-select: none;
`;

const SearchRowFlexGroup = styled(EuiFlexGroup)`
  user-select: none;
`;

const FilterGroupFlexItem = styled(EuiFlexItem)`
  margin-left: 24px;
`;

const SelectableQueryText = styled.span`
  margin-left: 3px;
  user-select: text;
`;

type Props = Pick<
  OpenTimelineProps,
  'onlyFavorites' | 'onQueryChange' | 'onToggleOnlyFavorites' | 'query' | 'totalSearchResultsCount'
>;

/**
 * Renders the row containing the search input and Only Favorites filter
 */
export const SearchRow = pure<Props>(
  ({ onlyFavorites, onQueryChange, onToggleOnlyFavorites, query, totalSearchResultsCount }) => (
    <>
      <SearchRowFlexGroup
        alignItems="flexStart"
        direction="row"
        gutterSize="none"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={true}>
          <EuiSearchBar
            data-test-subj="search-bar"
            box={{
              placeholder: i18n.SEARCH_PLACEHOLDER,
              incremental: false,
            }}
            onChange={onQueryChange}
          />
        </EuiFlexItem>

        <FilterGroupFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              data-test-subj="only-favorites-toggle"
              hasActiveFilters={onlyFavorites}
              onClick={onToggleOnlyFavorites}
            >
              {i18n.ONLY_FAVORITES}
            </EuiFilterButton>
          </EuiFilterGroup>
        </FilterGroupFlexItem>
      </SearchRowFlexGroup>

      <EuiSpacer size="s" />

      <ShowingContainer data-test-subj="showing">
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            data-test-subj="query-message"
            id="xpack.siem.open.timeline.showingNTimelinesLabel"
            defaultMessage="Showing {totalSearchResultsCount} {totalSearchResultsCount, plural, one {Timeline} other {Timelines}} {with}"
            values={{
              totalSearchResultsCount,
              with: query.trim().length ? i18n.WITH : '',
            }}
          />
          <SelectableQueryText data-test-subj="selectable-query-text">
            {query.trim()}
          </SelectableQueryText>
        </EuiText>
      </ShowingContainer>
    </>
  )
);
