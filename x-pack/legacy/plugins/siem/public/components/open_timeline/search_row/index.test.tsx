/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButtonProps } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { SearchRow } from '.';

import * as i18n from '../translations';

describe('SearchRow', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('it renders a search input with the expected placeholder when the query is empty', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <SearchRow
          onlyFavorites={false}
          query=""
          totalSearchResultsCount={0}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('input')
        .first()
        .props()
    ).toHaveProperty('placeholder', i18n.SEARCH_PLACEHOLDER);
  });

  describe('Only Favorites Button', () => {
    test('it renders the expected button text', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query=""
            totalSearchResultsCount={0}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="only-favorites-toggle"]')
          .first()
          .text()
      ).toEqual(i18n.ONLY_FAVORITES);
    });

    test('it invokes onToggleOnlyFavorites when clicked', () => {
      const onToggleOnlyFavorites = jest.fn();

      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query=""
            totalSearchResultsCount={0}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={onToggleOnlyFavorites}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .simulate('click');

      expect(onToggleOnlyFavorites).toHaveBeenCalled();
    });

    test('it sets the button to the toggled state when onlyFavorites is true', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={true}
            query=""
            totalSearchResultsCount={0}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .props() as EuiFilterButtonProps;

      expect(props.hasActiveFilters).toBe(true);
    });

    test('it sets the button to the NON-toggled state when onlyFavorites is false', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query=""
            totalSearchResultsCount={0}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      const props = wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .props() as EuiFilterButtonProps;

      expect(props.hasActiveFilters).toBe(false);
    });
  });

  describe('#onQueryChange', () => {
    const onQueryChange = jest.fn();

    test('it invokes onQueryChange when the user enters a query', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query=""
            totalSearchResultsCount={32}
            onQueryChange={onQueryChange}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: 'abcd' } });

      expect(onQueryChange).toHaveBeenCalled();
    });
  });

  describe('Showing message', () => {
    test('it renders the expected message when the query is an empty string', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query=""
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing: 32 timelines ');
    });

    test('it renders the expected message when the query just has whitespace', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query="   "
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing: 32 timelines ');
    });

    test('it includes the word "with" when the query has non-whitespace characters', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query="How was your day?"
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing: 32 timelines with');
    });
  });

  describe('selectable query text', () => {
    test('it renders an empty string when the query is an empty string', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query=""
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="selectable-query-text"]')
          .first()
          .text()
      ).toEqual('');
    });

    test('it renders the expected message when the query just has spaces', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query="   "
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="selectable-query-text"]')
          .first()
          .text()
      ).toEqual('');
    });

    test('it echos the query when the query has non-whitespace characters', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query="Would you like to go to Denver?"
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="selectable-query-text"]')
          .first()
          .text()
      ).toContain('Would you like to go to Denver?');
    });

    test('trims whitespace from the ends of the query', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <SearchRow
            onlyFavorites={false}
            query="   Is it starting to feel cramped in here?   "
            totalSearchResultsCount={32}
            onQueryChange={jest.fn()}
            onToggleOnlyFavorites={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="selectable-query-text"]')
          .first()
          .text()
      ).toContain('Is it starting to feel cramped in here?');
    });
  });
});
