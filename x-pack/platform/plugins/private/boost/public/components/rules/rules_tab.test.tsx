/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_PROFILES,
  DEFAULT_DATA_STREAMS_RULE_NAME,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostProfile, BoostRule } from '../../../common/types';
import { RulesTab, getProfileRulesLocation } from './rules_tab';

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({ notifications: { toasts: { addSuccess: jest.fn() } } }),
}));

jest.mock('../../hooks/use_boost_state', () => ({
  useDeleteRule: () => ({ mutate: jest.fn(), isLoading: false }),
}));

// The project default's editor, which edits a default rule.
jest.mock('../project_defaults/project_default_flyout', () => ({
  ProjectDefaultFlyout: ({ type }: { type: string }) => {
    const { createElement } = jest.requireActual('react');
    return createElement('div', { 'data-test-subj': 'mockProjectDefaultFlyout' }, type);
  },
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
            ...createDefaultRules(DEFAULT_RULE_PROFILES),
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
            { name: 'archives-2024', type: 'index', size_in_bytes: 0 },
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
    // The table always pages, however few rules there are.
    expect(screen.getByTestId('boostRulesTable')).toHaveTextContent('Rows per page: 10');
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

describe('RulesTab matches', () => {
  const getRow = (name: string) => {
    const row = screen.getByText(name).closest('tr');
    if (!row) {
      throw new Error(`No row for ${name}`);
    }
    return within(row);
  };

  it('sorts default rules as applying to the most', async () => {
    renderTab('/rules');
    const isDefaultRow = (row: HTMLElement) => within(row).queryByText('Default') !== null;
    const getDefaultRowPositions = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .flatMap((row, index) => (isDefaultRow(row) ? [index] : []));
    const rowCount = screen.getAllByRole('row').length - 1;

    await userEvent.click(screen.getByRole('button', { name: /Applies to/ }));
    expect(getDefaultRowPositions()).toEqual([rowCount - 2, rowCount - 1]);

    await userEvent.click(screen.getByRole('button', { name: /Applies to/ }));
    expect(getDefaultRowPositions()).toEqual([0, 1]);
  });

  it('counts what a rule applies to, and lists what it matches with what a higher-ranked rule takes', async () => {
    renderTab('/rules');

    const picked = getRow('picked');
    // Of its two matches, a higher-ranked rule takes one.
    expect(picked.getByTestId('boostRuleMatches')).toHaveTextContent('1 index');
    expect(picked.getByTestId('boostRuleOutranked')).toHaveTextContent('1 outranked');
    await userEvent.click(picked.getByTestId('boostRuleMatches'));

    const popover = within(screen.getByRole('dialog'));
    expect(popover.getByText('Using selected indices')).toBeInTheDocument();
    expect(popover.getByTestId('boostSupersededTarget')).toHaveTextContent('products');
    expect(popover.getByTestId('boostSupersedingRule')).toHaveTextContent('products-first');
  });

  it('explains a higher-ranked rule when its name is hovered', async () => {
    renderTab('/rules');

    await userEvent.click(getRow('picked').getByTestId('boostRuleMatches'));
    // EUI's popover ignores the pointer until it finishes opening.
    await waitFor(() => expect(screen.getByRole('dialog')).not.toHaveStyle('pointer-events: none'));
    await userEvent.hover(within(screen.getByRole('dialog')).getByText('products-first'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '"products-first" ranks higher, so it applies instead. To outrank it, increase this rule\'s priority.'
    );
  });

  it("shows a pattern rule's pattern above what it matches", async () => {
    renderTab('/rules');

    await userEvent.click(getRow('archives').getByTestId('boostRuleMatches'));

    const popover = screen.getByRole('dialog');
    expect(popover).toHaveTextContent('Using index pattern archives-*');
    expect(popover).not.toHaveTextContent('Using selected');
    expect(popover).toHaveTextContent('archives-2024');
    // No higher-ranked rule takes any of its matches, so there's nothing outranked to note.
    expect(getRow('archives').queryByTestId('boostRuleOutranked')).not.toBeInTheDocument();
  });

  it("doesn't show a pattern for a rule that names its targets", async () => {
    renderTab('/rules');

    await userEvent.click(getRow('products-first').getByTestId('boostRuleMatches'));

    expect(screen.getByRole('dialog')).not.toHaveTextContent('Using index pattern');
  });

  it('describes default rules without counting or listing what they match', () => {
    renderTab('/rules');

    const defaults = getRow('elastic-default-indices');
    expect(defaults.getByText('All unmatched indices')).toBeInTheDocument();
    expect(defaults.queryByTestId('boostRuleMatches')).not.toBeInTheDocument();
  });

  it("doesn't link a count for a rule that matches nothing", () => {
    renderTab('/rules');

    expect(getRow('catalogs').queryByTestId('boostRuleMatches')).not.toBeInTheDocument();
  });
});

describe('RulesTab search', () => {
  it('searches rule names and profiles, but not patterns', async () => {
    renderTab('/rules');

    await userEvent.type(screen.getByRole('searchbox'), 'users');

    expect(screen.queryByText('picked')).not.toBeInTheDocument();
  });
});

describe('RulesTab editing', () => {
  it('edits a default rule as its project default', async () => {
    renderTab('/rules');
    const row = screen.getByText(DEFAULT_DATA_STREAMS_RULE_NAME).closest('tr') as HTMLElement;

    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));

    expect(screen.getByTestId('mockProjectDefaultFlyout')).toHaveTextContent('data_streams');
  });
});
