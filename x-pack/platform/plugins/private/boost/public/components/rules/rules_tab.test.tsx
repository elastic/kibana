/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_PROFILES,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  createDefaultRules,
  translateSimpleDefaults,
} from '../../../common/presets';
import type { BoostProfile, BoostRule } from '../../../common/types';
import { RulesTab, getProfileRulesLocation } from './rules_tab';

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({ notifications: { toasts: { addSuccess: jest.fn() } } }),
}));

jest.mock('../../hooks/use_boost_state', () => ({
  useDeleteRule: () => ({ mutate: jest.fn(), isLoading: false }),
}));

const customProfile = (name: string): BoostProfile => ({
  name,
  type: 'indices',
  is_builtin: false,
  min_boost: 1,
  max_boost: 4,
  high_availability: 'none',
  prewarm: false,
  pinned: false,
});

const customRule = (
  name: string,
  profileName: string,
  patterns = [`${name}-*`],
  priority = 1
): BoostRule => ({
  name,
  index_patterns: patterns,
  boost_profile: profileName,
  priority,
  is_builtin: false,
});

const renderTab = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <IntlProvider locale="en">
        <RulesTab
          rules={[
            ...createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS)),
            customRule('catalogs', 'catalog-search'),
            customRule('archives', 'archive-search'),
            // Picks two indices, one of which a higher-priority rule takes.
            customRule('picked', 'archive-search', ['products', 'users']),
            customRule('products-first', 'catalog-search', ['products'], 5),
          ]}
          profiles={[
            ...BUILTIN_PROFILES,
            customProfile('catalog-search'),
            customProfile('archive-search'),
          ]}
          dataSources={[
            { name: 'products', type: 'index', size_in_bytes: 0 },
            { name: 'users', type: 'index', size_in_bytes: 0 },
          ]}
          canEdit
        />
      </IntlProvider>
    </MemoryRouter>
  );

describe('RulesTab', () => {
  it('lists every rule by default', () => {
    renderTab('/rules');

    expect(screen.getByText('catalogs')).toBeInTheDocument();
    expect(screen.getByText('archives')).toBeInTheDocument();
  });

  it('starts filtered to the rules that use the profile in its location', () => {
    const { pathname, search } = getProfileRulesLocation('catalog-search');
    renderTab(`${pathname}${search}`);

    expect(screen.getByText('catalogs')).toBeInTheDocument();
    expect(screen.queryByText('archives')).not.toBeInTheDocument();
  });
});

describe('RulesTab profile filter', () => {
  const openFilter = () => userEvent.click(screen.getByTestId('boostRulesProfileFilter'));
  const getOptions = () =>
    within(screen.getByTestId('boostRulesProfileFilterList')).getAllByRole('option');
  const clickOption = (name: string) =>
    userEvent.click(
      within(screen.getByTestId('boostRulesProfileFilterList')).getByRole('option', {
        name: new RegExp(name),
      })
    );

  it('includes, then excludes, then clears a profile', async () => {
    renderTab('/rules');
    await openFilter();

    await clickOption('catalog-search');
    expect(screen.getByText('catalogs')).toBeInTheDocument();
    expect(screen.queryByText('archives')).not.toBeInTheDocument();

    await clickOption('catalog-search');
    expect(screen.queryByText('catalogs')).not.toBeInTheDocument();
    expect(screen.getByText('archives')).toBeInTheDocument();

    await clickOption('catalog-search');
    expect(screen.getByText('catalogs')).toBeInTheDocument();
    expect(screen.getByText('archives')).toBeInTheDocument();
  });

  it('keeps profiles in alphabetical order as they are selected', async () => {
    renderTab('/rules');
    await openFilter();
    // Each option's text ends with screen reader instructions, which change as it's selected.
    const order = () => getOptions().map(({ textContent }) => textContent?.split('. ')[0]);
    const before = order();

    await clickOption('elastic-performant');

    expect(order()).toEqual(before);
    expect(before).toEqual([...before].sort());
  });

  it('shows a linked profile as included', async () => {
    const { pathname, search } = getProfileRulesLocation('catalog-search');
    renderTab(`${pathname}${search}`);
    await openFilter();

    expect(
      within(screen.getByTestId('boostRulesProfileFilterList')).getByRole('option', {
        name: /catalog-search/,
        checked: true,
      })
    ).toBeInTheDocument();
  });
});

describe('RulesTab filters', () => {
  it('filter without writing query syntax into the search box', async () => {
    renderTab('/rules');

    await userEvent.click(screen.getByTestId('boostRulesProfileFilter'));
    await userEvent.click(
      within(screen.getByTestId('boostRulesProfileFilterList')).getByRole('option', {
        name: /catalog-search/,
      })
    );
    await userEvent.click(screen.getByTestId('boostTypeFilter-indices'));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByText('catalogs')).toBeInTheDocument();
    expect(screen.queryByText('archives')).not.toBeInTheDocument();
  });
});

describe('RulesTab superseded targets', () => {
  const getRow = (name: string) => {
    const row = screen.getByText(name).closest('tr');
    if (!row) {
      throw new Error(`No row for ${name}`);
    }
    return within(row);
  };

  it('notes and strikes through targets a higher-ranked rule applies to', () => {
    renderTab('/rules');

    const picked = getRow('picked');
    expect(picked.getByTestId('boostRuleSuperseded')).toBeInTheDocument();
    expect(picked.getByTestId('boostSupersededTarget')).toHaveTextContent('products');
    expect(picked.getByText('(Higher-ranked rule: products-first)')).toBeInTheDocument();

    const productsFirst = getRow('products-first');
    expect(productsFirst.queryByTestId('boostRuleSuperseded')).not.toBeInTheDocument();
    expect(productsFirst.queryByTestId('boostSupersededTarget')).not.toBeInTheDocument();
  });

  it("doesn't note the targets default rules leave to other rules", () => {
    renderTab('/rules');

    expect(
      getRow('elastic-default-indices').queryByTestId('boostRuleSuperseded')
    ).not.toBeInTheDocument();
  });
});
