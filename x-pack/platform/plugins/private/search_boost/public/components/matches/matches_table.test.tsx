/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { contentListQueryClient } from '@kbn/content-list-provider';
import type { BoostRuleMatch, DataRetention } from '../../../common/types';
import { createMockMatches } from '../test_utils/mock_boost_data';
import type { MatchesTableProps } from './matches_table';
import { MatchesTable } from './matches_table';

const renderTable = (props: Partial<MatchesTableProps> = {}) => render(getTable(props));

const getTable = (props: Partial<MatchesTableProps> = {}) => (
  <I18nProvider>
    <MatchesTable
      type="indices"
      matches={createMockMatches('indices', 9)}
      queryKeyScope="matches-table-test"
      getMatchLinkProps={() => ({ href: '#', onClick: jest.fn() })}
      getRuleLinkProps={(ruleName) => ({ href: `#/rules/${ruleName}`, onClick: jest.fn() })}
      {...props}
    />
  </I18nProvider>
);

const getMatchNames = () =>
  within(screen.getByTestId('searchBoostMatchesTable'))
    .queryAllByTestId('searchBoostMatchLink')
    .map(({ textContent }) => textContent);

const getColumnNames = () =>
  within(screen.getByTestId('searchBoostMatchesTable'))
    .getAllByRole('columnheader')
    .map(({ textContent }) => textContent);

// The header also holds its info tooltip text.
const hasOutrankedByColumn = () =>
  getColumnNames().some((name) => name?.startsWith('Outranked by rule'));

const toMatch = (name: string, isHidden = false): BoostRuleMatch => ({ name, isHidden });

describe('MatchesTable', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('leaves hidden matches out until "Show hidden" is on', async () => {
    renderTable();

    await waitFor(() => expect(getMatchNames()).toHaveLength(8));
    expect(getMatchNames()).not.toContain('.products-08');
    expect(screen.getByTestId('searchBoostMatchesCount')).toHaveTextContent(
      'Showing 1–8 of 8 indices · 1 hidden'
    );

    await userEvent.click(screen.getByTestId('searchBoostShowHidden'));

    await waitFor(() => expect(getMatchNames()).toContain('.products-08'));
    expect(screen.getByTestId('searchBoostHiddenBadge')).toHaveTextContent('Hidden');
    expect(screen.getByTestId('searchBoostMatchesCount')).toHaveTextContent(
      'Showing 1–9 of 9 indices'
    );
  });

  it('uses the latest link getters', async () => {
    const outranked = { ...toMatch('b'), outrankedByRuleName: 'catalog' };
    const matches = [toMatch('a'), outranked];
    const { rerender } = renderTable({ matches, isOutrankingComputed: true });
    await screen.findByRole('link', { name: 'a' });

    rerender(
      getTable({
        matches,
        isOutrankingComputed: true,
        getMatchLinkProps: (name) => ({ href: `#/moved/${name}`, onClick: jest.fn() }),
        getRuleLinkProps: (ruleName) => ({ href: `#/moved/rules/${ruleName}`, onClick: jest.fn() }),
      })
    );

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'a' })).toHaveAttribute('href', '#/moved/a')
    );
    expect(screen.getByTestId('searchBoostOutrankedByLink')).toHaveAttribute(
      'href',
      '#/moved/rules/catalog'
    );
  });

  it('searches by name', async () => {
    renderTable({ matches: [toMatch('catalog-products'), toMatch('orders')] });

    await userEvent.type(await screen.findByPlaceholderText('Search indices'), 'catalog');

    await waitFor(() => expect(getMatchNames()).toEqual(['catalog-products']));
  });

  it('shows data retention for data streams only, sorting by how long it keeps data', async () => {
    const day = 86_400_000;
    const withRetention = (name: string, retention: DataRetention): BoostRuleMatch => ({
      ...toMatch(name),
      retention,
    });
    renderTable({
      type: 'data_streams',
      matches: [
        withRetention('a', { type: 'value', value: '30 days', inMilliseconds: 30 * day }),
        withRetention('b', { type: 'infinite' }),
        withRetention('c', { type: 'disabled' }),
        withRetention('d', { type: 'value', value: '7 days', inMilliseconds: 7 * day }),
      ],
    });

    await waitFor(() => expect(getMatchNames()).toEqual(['a', 'b', 'c', 'd']));
    expect(getColumnNames()).toContain('Data retention');

    await userEvent.click(screen.getByRole('button', { name: /Data retention/ }));

    await waitFor(() => expect(getMatchNames()).toEqual(['d', 'a', 'b', 'c']));
  });

  it('has no data retention column for indices', async () => {
    renderTable();

    await waitFor(() => expect(getMatchNames()).toHaveLength(8));
    expect(getColumnNames()).not.toContain('Data retention');
  });

  it('disables "Show hidden" when nothing hidden matches', async () => {
    renderTable({ matches: [toMatch('orders')] });

    const showHidden = await screen.findByTestId('searchBoostShowHidden');
    expect(showHidden).toBeDisabled();
    expect(showHidden).toHaveAccessibleDescription('This rule matches no hidden indices.');
  });

  describe('outranked matches', () => {
    const outrankedMatches = [
      toMatch('a'),
      { ...toMatch('b'), outrankedByRuleName: 'catalog' },
      toMatch('c'),
    ];

    it('marks them and names the rule that outranks each', async () => {
      renderTable({ matches: outrankedMatches, isOutrankingComputed: true });

      await waitFor(() => expect(getMatchNames()).toEqual(['a', 'b', 'c']));
      expect(hasOutrankedByColumn()).toBe(true);
      expect(screen.getByRole('link', { name: 'b' })).toHaveStyle({
        textDecoration: 'line-through',
      });
      expect(screen.getByTestId('searchBoostOutrankedByLink')).toHaveAttribute(
        'href',
        '#/rules/catalog'
      );
    });

    it('filters by whether the rule applies, counting what each filter would show', async () => {
      renderTable({ matches: outrankedMatches, isOutrankingComputed: true });

      expect(await screen.findByTestId('searchBoostStatusFilter-applied')).toHaveTextContent('2');
      expect(screen.getByTestId('searchBoostStatusFilter-outranked')).toHaveTextContent('1');

      await userEvent.click(screen.getByTestId('searchBoostStatusFilter-outranked'));

      await waitFor(() => expect(getMatchNames()).toEqual(['b']));
    });

    it('disables the filter with nothing to show, saying why to keyboard users too', async () => {
      renderTable({ matches: [toMatch('a')], isOutrankingComputed: true });

      const outrankedFilter = await screen.findByTestId('searchBoostStatusFilter-outranked');
      expect(outrankedFilter).toHaveAttribute('aria-disabled', 'true');
      expect(hasOutrankedByColumn()).toBe(false);

      act(() => outrankedFilter.focus());

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'No higher-ranked rule outranks this one for any of these matches.'
      );
    });

    it('counts the hidden matches the status filter would show', async () => {
      renderTable({
        matches: [
          toMatch('a'),
          { ...toMatch('b'), outrankedByRuleName: 'catalog' },
          toMatch('.hidden-applied', true),
          { ...toMatch('.hidden-outranked', true), outrankedByRuleName: 'catalog' },
        ],
        isOutrankingComputed: true,
      });

      await userEvent.click(await screen.findByTestId('searchBoostStatusFilter-outranked'));

      await waitFor(() => expect(getMatchNames()).toEqual(['b']));
      expect(screen.getByTestId('searchBoostMatchesCount')).toHaveTextContent(
        'Showing 1 of 1 index · 1 hidden'
      );
    });

    it('shows the column only while an outranked match is shown', async () => {
      renderTable({
        matches: [toMatch('a'), { ...toMatch('.hidden', true), outrankedByRuleName: 'catalog' }],
        isOutrankingComputed: true,
      });

      await waitFor(() => expect(getMatchNames()).toEqual(['a']));
      expect(hasOutrankedByColumn()).toBe(false);

      await userEvent.click(screen.getByTestId('searchBoostShowHidden'));

      await waitFor(() => expect(hasOutrankedByColumn()).toBe(true));
    });

    it('leaves them out until that data is passed in', async () => {
      renderTable({ matches: outrankedMatches });

      await waitFor(() => expect(getMatchNames()).toEqual(['a', 'b', 'c']));
      expect(hasOutrankedByColumn()).toBe(false);
      expect(screen.queryByTestId('searchBoostStatusFilter-applied')).not.toBeInTheDocument();
    });
  });

  describe('empty', () => {
    it('says when the rule matches nothing', async () => {
      renderTable({ matches: [] });

      expect(await screen.findByTestId('searchBoostMatchesEmpty')).toHaveTextContent(
        'This rule matches nothing yet.'
      );
    });

    it('says when only hidden matches are left out, keeping "Show hidden" at hand', async () => {
      renderTable({ matches: [toMatch('.hidden-index', true)] });

      expect(await screen.findByTestId('searchBoostMatchesEmpty')).toHaveTextContent(
        'Only hidden indices match. Show hidden to see them.'
      );

      await userEvent.click(screen.getByTestId('searchBoostShowHidden'));

      await waitFor(() => expect(getMatchNames()).toEqual(['.hidden-index']));
    });

    it('says when the search leaves nothing', async () => {
      renderTable({ matches: [toMatch('orders')] });

      await userEvent.type(await screen.findByPlaceholderText('Search indices'), 'catalog');

      expect(
        await screen.findByText('No indices match your search or filter.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('searchBoostMatchesCount')).not.toBeInTheDocument();
    });
  });
});
