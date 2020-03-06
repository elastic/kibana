/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { cloneDeep } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../../pages/timelines/timelines_page';
import { InsertTimelineResult } from '../types';
import { mockTimelineResults } from '../../../mock/timeline_results';
import { InsertTimelinePopoverBody } from './insert_timeline_popover_body';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '../constants';

jest.mock('../../../lib/kibana');

describe('InsertTimelinePopover', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let mockResults: InsertTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the search row', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <InsertTimelinePopoverBody
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          isLoading={false}
          onlyFavorites={false}
          onInsertTimeline={jest.fn()}
          onQueryChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          query={''}
          searchResults={mockResults}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('[data-test-subj="search-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the timelines table', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <InsertTimelinePopoverBody
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          isLoading={false}
          onlyFavorites={false}
          onInsertTimeline={jest.fn()}
          onQueryChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          query={''}
          searchResults={mockResults}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('[data-test-subj="timelines-table"]')
        .first()
        .exists()
    ).toBe(true);
  });
});
