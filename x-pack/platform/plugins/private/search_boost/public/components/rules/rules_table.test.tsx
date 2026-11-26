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
import { ContentList, ContentListToolbar } from '@kbn/content-list';
import { contentListQueryClient } from '@kbn/content-list-provider';
import { mockRules } from '../test_utils/mock_boost_data';
import type { RulesTableProps } from './rules_table';
import { RulesTable } from './rules_table';
import { RulesListProvider } from './rules_list_provider';

const PROFILE_RULES = mockRules.filter(
  ({ boost_profile: profileName }) => profileName === 'logs-recent-week'
);

const renderRulesTable = (props: Partial<RulesTableProps> = {}) =>
  render(
    <I18nProvider>
      <RulesListProvider rules={PROFILE_RULES} queryKeyScope="rules-table-test">
        <ContentList>
          <RulesTable
            title="Boost rules"
            getRuleLinkProps={(ruleName) => ({ href: `#/rules/${ruleName}`, onClick: jest.fn() })}
            data-test-subj="rulesTable"
            {...props}
          />
        </ContentList>
      </RulesListProvider>
    </I18nProvider>
  );

const getColumnNames = () =>
  within(screen.getByTestId('rulesTable'))
    .getAllByRole('columnheader')
    .map((header) => header.textContent);

const getRows = () =>
  within(screen.getByTestId('rulesTable'))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    );

describe('RulesTable', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('shows each rule with its profile', async () => {
    renderRulesTable();

    await waitFor(() =>
      expect(getRows()).toEqual([
        ['apache-logs', 'logs-recent-week', 'logs-apache-default', '5', '1 data stream'],
        ['web-logs', 'logs-recent-week', 'logs-*', '5', '1 data stream'],
      ])
    );
    expect(getColumnNames()).not.toContain('Storage size');
  });

  it('can show storage size instead of the profile, as on a profile page', async () => {
    renderRulesTable({ showsProfile: false, showsStorageSize: true });

    await waitFor(() =>
      expect(getRows()).toEqual([
        ['apache-logs', 'logs-apache-default', '5', '1 data stream', '7 GB'],
        ['web-logs', 'logs-*', '5', '1 data stream', '19.6 GB'],
      ])
    );
    expect(getColumnNames()).not.toContain('Profile name');
  });

  it('links rule names to their details', async () => {
    renderRulesTable();

    expect(await screen.findByRole('link', { name: 'web-logs' })).toHaveAttribute(
      'href',
      '#/rules/web-logs'
    );
  });

  it("can leave profile names out of the search, as on a profile's page", async () => {
    render(
      <I18nProvider>
        <RulesListProvider
          rules={PROFILE_RULES}
          queryKeyScope="rules-table-name-only-test"
          searchesProfileNames={false}
        >
          <ContentList>
            <ContentListToolbar />
            <RulesTable
              title="Boost rules"
              getRuleLinkProps={() => ({ href: '#', onClick: jest.fn() })}
              data-test-subj="rulesTable"
            />
          </ContentList>
        </RulesListProvider>
      </I18nProvider>
    );
    const search = await screen.findByPlaceholderText('Search boost rules');

    await userEvent.type(search, 'web');
    await waitFor(() => expect(getRows().map(([name]) => name)).toEqual(['web-logs']));

    await userEvent.clear(search);
    await userEvent.type(search, 'recent');
    expect(await screen.findByText('No items found')).toBeInTheDocument();
  });
});
