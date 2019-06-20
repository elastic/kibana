/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButtonProps } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { SearchRow } from '.';

import * as i18n from '../translations';

describe('SearchRow', () => {
  test('it renders a search input with the expected placeholder when the query is empty', () => {
    const wrapper = mountWithIntl(
      <SearchRow
        onlyFavorites={false}
        onQueryChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        query=""
        totalSearchResultsCount={0}
      />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          totalSearchResultsCount={0}
        />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={onToggleOnlyFavorites}
          query=""
          totalSearchResultsCount={0}
        />
      );

      wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .simulate('click');

      expect(onToggleOnlyFavorites).toHaveBeenCalled();
    });

    test('it sets the button to the toggled state when onlyFavorites is true', () => {
      const wrapper = mountWithIntl(
        <SearchRow
          onlyFavorites={true}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          totalSearchResultsCount={0}
        />
      );

      const props = wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .props() as EuiFilterButtonProps;

      expect(props.hasActiveFilters).toBe(true);
    });

    test('it sets the button to the NON-toggled state when onlyFavorites is false', () => {
      const wrapper = mountWithIntl(
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          totalSearchResultsCount={0}
        />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={onQueryChange}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          totalSearchResultsCount={32}
        />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          totalSearchResultsCount={32}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing 32 Timelines');
    });

    test('it renders the expected message when the query just has whitespace', () => {
      const wrapper = mountWithIntl(
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query="   "
          totalSearchResultsCount={32}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing 32 Timelines');
    });

    test('it includes the word "with" when the query has non-whitespace characters', () => {
      const wrapper = mountWithIntl(
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query="How was your day?"
          totalSearchResultsCount={32}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing 32 Timelines with');
    });
  });

  describe('selectable query text', () => {
    test('it renders an empty string when the query is an empty string', () => {
      const wrapper = mountWithIntl(
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query=""
          totalSearchResultsCount={32}
        />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query="   "
          totalSearchResultsCount={32}
        />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query="Would you like to go to Denver?"
          totalSearchResultsCount={32}
        />
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
        <SearchRow
          onlyFavorites={false}
          onQueryChange={jest.fn()}
          onToggleOnlyFavorites={jest.fn()}
          query="   Is it starting to feel cramped in here?   "
          totalSearchResultsCount={32}
        />
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
