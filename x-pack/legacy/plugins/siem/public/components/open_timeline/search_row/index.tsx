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
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';
import styled from 'styled-components';

import * as i18n from '../translations';
import { OpenTimelineProps } from '../types';

const SearchRowContainer = styled.div`
  &:not(:last-child) {
    margin-bottom: ${props => props.theme.eui.euiSizeL};
  }
`;

SearchRowContainer.displayName = 'SearchRowContainer';

const SearchRowFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: ${props => props.theme.eui.euiSizeXS};
`;

SearchRowFlexGroup.displayName = 'SearchRowFlexGroup';

type Props = Pick<
  OpenTimelineProps,
  'onlyFavorites' | 'onQueryChange' | 'onToggleOnlyFavorites' | 'query' | 'totalSearchResultsCount'
>;

/**
 * Renders the row containing the search input and Only Favorites filter
 */
export const SearchRow = React.memo<Props>(
  ({ onlyFavorites, onQueryChange, onToggleOnlyFavorites, query, totalSearchResultsCount }) => (
    <SearchRowContainer>
      <SearchRowFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSearchBar
            data-test-subj="search-bar"
            box={{
              placeholder: i18n.SEARCH_PLACEHOLDER,
              incremental: false,
            }}
            onChange={onQueryChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              data-test-subj="only-favorites-toggle"
              hasActiveFilters={onlyFavorites}
              onClick={onToggleOnlyFavorites}
            >
              {i18n.ONLY_FAVORITES}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      </SearchRowFlexGroup>

      <EuiText color="subdued" size="xs">
        <p>
          <FormattedMessage
            data-test-subj="query-message"
            id="xpack.siem.open.timeline.showingNTimelinesLabel"
            defaultMessage="Showing: {totalSearchResultsCount} {totalSearchResultsCount, plural, one {timeline} other {timelines}} {with}"
            values={{
              totalSearchResultsCount,
              with: (
                <span data-test-subj="selectable-query-text">
                  {query.trim().length ? `${i18n.WITH} "${query.trim()}"` : ''}
                </span>
              ),
            }}
          />
        </p>
      </EuiText>
    </SearchRowContainer>
  )
);

SearchRow.displayName = 'SearchRow';
