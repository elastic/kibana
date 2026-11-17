/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { createMockRules, mockRules } from '../test_utils/mock_boost_data';
import type { RulesTabProps } from './rules_tab';
import { RulesTab } from './rules_tab';

type TestProps = Omit<RulesTabProps, 'getRuleLinkProps'> &
  Partial<Pick<RulesTabProps, 'getRuleLinkProps'>>;

const getRuleLinkProps = (ruleName: string) => ({
  href: `#/rules/${ruleName}`,
  onClick: jest.fn(),
});

const renderRulesTab = (props: TestProps) => {
  const result = render(
    <I18nProvider>
      <RulesTab getRuleLinkProps={getRuleLinkProps} {...props} />
    </I18nProvider>
  );
  return {
    ...result,
    rerenderRulesTab: (newProps: TestProps) =>
      result.rerender(
        <I18nProvider>
          <RulesTab getRuleLinkProps={getRuleLinkProps} {...newProps} />
        </I18nProvider>
      ),
  };
};

const getRuleNames = () =>
  within(screen.getByTestId('searchBoostRulesTable'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

const getPriorities = () =>
  within(screen.getByTestId('searchBoostRulesTable'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => Number(within(row).getAllByRole('cell')[3].textContent));

const waitForCount = (text: string) =>
  waitFor(() => expect(screen.getByTestId('searchBoostRulesCount')).toHaveTextContent(text));

const waitForRuleNames = (names: string[]) => waitFor(() => expect(getRuleNames()).toEqual(names));

const getRow = async (name: string) => (await screen.findByText(name)).closest('tr')!;

describe('RulesTab', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('lists the rules sorted by name, with a badge on the default rules', async () => {
    renderRulesTab({ rules: mockRules });

    await waitForRuleNames([
      '_default_data_streamsDefault',
      '_default_indicesDefault',
      'apache-logs',
      'catalog',
      'old-archives',
      'web-logs',
    ]);
    expect(screen.getByTestId('searchBoostRulesCount')).toHaveTextContent(
      'Showing 1–6 of 6 boost rules'
    );
  });

  it('links rule names to their details', async () => {
    renderRulesTab({ rules: mockRules });

    expect(await screen.findByRole('link', { name: 'catalog' })).toHaveAttribute(
      'href',
      '#/rules/catalog'
    );
  });

  it('shows what each rule applies to', async () => {
    renderRulesTab({ rules: mockRules });

    expect(await screen.findByTestId('searchBoostRuleNoMatches')).toHaveTextContent('0 indices');
    expect(screen.getAllByTestId('searchBoostRuleMatches').map((link) => link.textContent)).toEqual(
      ['1 data stream', '4 indices', '1 data stream', '2 indices', '1 data stream']
    );
  });

  it('opens what a rule matches from what it applies to', async () => {
    const user = userEvent.setup();
    renderRulesTab({ rules: mockRules });

    await user.click(within(await getRow('_default_indices')).getByText('4 indices'));

    const popover = await screen.findByRole('dialog', { name: 'Matching indices' });
    expect(within(popover).getByText('6 matches, 2 outranked')).toBeInTheDocument();
    expect(
      within(popover)
        .getAllByTestId('searchBoostMatchesPopoverItem')
        .map((item) => item.textContent)
    ).toEqual(['catalog-productsOutranked', 'catalog-reviewsOutranked', 'customers', 'orders']);
  });

  it('searches rule names and profile names, not patterns', async () => {
    const user = userEvent.setup();
    renderRulesTab({ rules: mockRules });
    const search = await screen.findByPlaceholderText('Search boost rules');

    await user.type(search, 'catalog-fast');
    await waitForRuleNames(['catalog']);

    await user.clear(search);
    await user.type(search, 'archives');
    await waitForRuleNames(['old-archives']);

    await user.clear(search);
    await user.type(search, 'apache-default');
    expect(await screen.findByText('No items found')).toBeInTheDocument();
  });

  it('starts filtered by the given profile', async () => {
    renderRulesTab({ rules: mockRules, initialProfileName: 'logs-recent-week' });

    await waitForRuleNames(['apache-logs', 'web-logs']);
  });

  it('starts filtered by a profile whose name has quotes', async () => {
    const quotedRule = {
      ...mockRules[0],
      is_builtin: false,
      name: 'quoted',
      boost_profile: 'say "hi" \\o/',
    };
    renderRulesTab({ rules: [quotedRule, ...mockRules], initialProfileName: 'say "hi" \\o/' });

    await waitForRuleNames(['quoted']);
  });

  it('sorts by priority', async () => {
    const user = userEvent.setup();
    renderRulesTab({ rules: mockRules });
    await waitForRuleNames(expect.any(Array));
    const ascending = [...mockRules.map(({ priority }) => priority)].sort((a, b) => a - b);

    await user.click(screen.getByRole('button', { name: /Priority/ }));
    await waitFor(() => expect(getPriorities()).toEqual(ascending));

    await user.click(screen.getByRole('button', { name: /Priority/ }));
    await waitFor(() => expect(getPriorities()).toEqual([...ascending].reverse()));
  });

  it('filters by type, counting what each type would show', async () => {
    const user = userEvent.setup();
    renderRulesTab({ rules: mockRules });
    const getTypeFilter = (type: string) => screen.getByTestId(`searchBoostTypeFilter-${type}`);

    expect(await screen.findByTestId('searchBoostTypeFilter-indices')).toHaveTextContent('3');
    expect(getTypeFilter('data_streams')).toHaveTextContent('3');

    await user.click(getTypeFilter('data_streams'));
    await waitForRuleNames(['_default_data_streamsDefault', 'apache-logs', 'web-logs']);

    await user.type(screen.getByPlaceholderText('Search boost rules'), ' catalog');
    await waitFor(() => expect(getTypeFilter('indices')).toHaveTextContent('1'));
    expect(getTypeFilter('data_streams')).toHaveTextContent('0');
    // An active filter stays enabled with nothing to show, so it can be turned off.
    expect(getTypeFilter('data_streams')).toBeEnabled();

    await user.click(getTypeFilter('data_streams'));
    await waitForRuleNames(['catalog']);
    expect(getTypeFilter('data_streams')).toBeDisabled();
  });

  it('pages through 10 rules at a time', async () => {
    const user = userEvent.setup();
    renderRulesTab({ rules: createMockRules(23) });

    await waitFor(() =>
      expect(screen.getByTestId('searchBoostRulesCount')).toHaveTextContent(
        'Showing 1–10 of 23 boost rules'
      )
    );
    await user.click(screen.getByRole('button', { name: /Page 2 of 3/ }));
    await waitFor(() =>
      expect(screen.getByTestId('searchBoostRulesCount')).toHaveTextContent(
        'Showing 11–20 of 23 boost rules'
      )
    );
  });

  it('goes back to the last page when rules are removed from it', async () => {
    const user = userEvent.setup();
    const { rerenderRulesTab } = renderRulesTab({ rules: createMockRules(21) });

    await user.click(await screen.findByRole('button', { name: /Page 3 of 3/ }));
    await waitForCount('Showing 21–21 of 21 boost rules');

    rerenderRulesTab({ rules: createMockRules(20) });
    await waitForCount('Showing 11–20 of 20 boost rules');
    expect(getRuleNames()).toHaveLength(10);
  });

  it('filters by a new initial profile', async () => {
    const { rerenderRulesTab } = renderRulesTab({ rules: mockRules });
    await screen.findByText('catalog');

    rerenderRulesTab({ rules: mockRules, initialProfileName: 'logs-recent-week' });

    await waitForRuleNames(['apache-logs', 'web-logs']);
  });

  it('uses the latest link getter', async () => {
    const { rerenderRulesTab } = renderRulesTab({ rules: mockRules });
    await screen.findByRole('link', { name: 'catalog' });

    rerenderRulesTab({
      rules: mockRules,
      getRuleLinkProps: (ruleName) => ({ href: `#/moved/${ruleName}`, onClick: jest.fn() }),
    });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'catalog' })).toHaveAttribute(
        'href',
        '#/moved/catalog'
      )
    );
  });

  it('shows rules that arrive after the first render', async () => {
    const { rerenderRulesTab } = renderRulesTab({ rules: mockRules });
    await screen.findByText('catalog');

    const newRule = { ...mockRules[2], name: 'new-rule', index_pattern: 'new-*' };
    rerenderRulesTab({ rules: [...mockRules, newRule] });

    const row = await getRow('new-rule');
    expect(row).toHaveTextContent('new-*');
  });

  it('formats large counts', async () => {
    renderRulesTab({ rules: createMockRules(1200) });

    await waitForCount('Showing 1–10 of 1,200 boost rules');
  });

  it('says when there are no rules, keeping the create button', async () => {
    renderRulesTab({ rules: [], canEdit: true, onCreate: jest.fn() });

    expect(await screen.findByText('No items found')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostCreateRule')).toBeInTheDocument();
  });

  describe('actions', () => {
    it("doesn't show them to users who can't edit", async () => {
      renderRulesTab({ rules: mockRules, onCreate: jest.fn(), onEdit: jest.fn() });

      await screen.findByText('catalog');
      expect(screen.queryByTestId('searchBoostCreateRule')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('calls back to create and edit', async () => {
      const user = userEvent.setup();
      const onCreate = jest.fn();
      const onEdit = jest.fn();
      renderRulesTab({ rules: mockRules, canEdit: true, onCreate, onEdit });

      await user.click(await screen.findByTestId('searchBoostCreateRule'));
      expect(onCreate).toHaveBeenCalled();

      await user.click(within(await getRow('catalog')).getByRole('button', { name: 'Edit' }));
      expect(onEdit).toHaveBeenCalledWith(mockRules.find(({ name }) => name === 'catalog'));
    });

    it('calls back to duplicate a custom rule', async () => {
      const onDuplicate = jest.fn();
      renderRulesTab({ rules: mockRules, canEdit: true, onDuplicate });

      await userEvent.click(
        within(await getRow('catalog')).getByRole('button', { name: 'Duplicate' })
      );
      expect(onDuplicate).toHaveBeenCalledWith(mockRules.find(({ name }) => name === 'catalog'));
    });

    it('offers duplicate and delete on custom rules only', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();
      renderRulesTab({
        rules: mockRules,
        canEdit: true,
        onEdit: jest.fn(),
        onDuplicate: jest.fn(),
        onDelete,
      });

      const defaultRow = await getRow('_default_indices');
      expect(within(defaultRow).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(within(defaultRow).queryByRole('button', { name: /^All actions/ })).toBeNull();

      await user.click(
        within(await getRow('catalog')).getByRole('button', { name: /^All actions/ })
      );
      await user.click(await screen.findByTestId('searchBoostDeleteRule'));
      expect(onDelete).toHaveBeenCalledWith(mockRules.find(({ name }) => name === 'catalog'));
    });
  });
});
