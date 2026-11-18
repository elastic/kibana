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
import { mockProfiles, mockRules } from '../test_utils/mock_boost_data';
import type { ProfilesTabProps } from './profiles_tab';
import { ProfilesTab } from './profiles_tab';

const renderProfilesTab = (props: Partial<ProfilesTabProps> = {}) =>
  render(
    <I18nProvider>
      <ProfilesTab
        profiles={mockProfiles}
        rules={mockRules}
        getProfileLinkProps={(profileName) => ({
          href: `#/profiles/${profileName}`,
          onClick: jest.fn(),
        })}
        getProfileRulesLinkProps={(profileName) => ({
          href: `#/rules/${profileName}`,
          onClick: jest.fn(),
        })}
        {...props}
      />
    </I18nProvider>
  );

const getRows = () =>
  within(screen.getByTestId('searchBoostProfilesTable'))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    );

const getRow = async (name: string) => (await screen.findByText(name)).closest('tr')!;

const findProfile = (profileName: string) => mockProfiles.find(({ name }) => name === profileName);

describe('ProfilesTab', () => {
  afterEach(() => {
    contentListQueryClient.clear();
  });

  it('links profile names to their details', async () => {
    renderProfilesTab();

    expect(await screen.findByRole('link', { name: 'catalog-fast' })).toHaveAttribute(
      'href',
      '#/profiles/catalog-fast'
    );
  });

  it('lists the profiles sorted by name, with their type, boost, and rules using them', async () => {
    renderProfilesTab();

    await waitFor(() =>
      expect(getRows()).toEqual([
        ['_performant_data_streamsManaged', 'Data streams', '1', '1', '1'],
        ['_performant_indicesManaged', 'Indices', '1', '1', '1'],
        ['archive-cheap', 'Indices', '0', '0.25', '1'],
        ['catalog-fast', 'Indices', '2', '8.5', '1'],
        ['logs-recent-week', 'Data streams', '1.5', '5,000', '2'],
      ])
    );
    expect(screen.getByTestId('searchBoostProfilesCount')).toHaveTextContent(
      'Showing 1–5 of 5 boost profiles'
    );
  });

  it('links to the rules using a profile', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderProfilesTab({
      getProfileRulesLinkProps: (profileName) => ({ href: `#/rules/${profileName}`, onClick }),
    });

    const link = await screen.findByRole('link', {
      name: 'View 2 rules using boost profile "logs-recent-week"',
    });
    expect(link).toHaveAttribute('href', '#/rules/logs-recent-week');

    await user.click(link);
    expect(onClick).toHaveBeenCalled();
  });

  it('shows the count without a link when no rule uses the profile', async () => {
    renderProfilesTab({ rules: [] });

    await screen.findByText('catalog-fast');
    expect(screen.queryByTestId('searchBoostProfileRulesLink')).not.toBeInTheDocument();
  });

  it('searches profile names and filters by type', async () => {
    const user = userEvent.setup();
    renderProfilesTab();

    await user.type(await screen.findByPlaceholderText('Search boost profiles'), 'performant');
    await waitFor(() =>
      expect(screen.getByTestId('searchBoostTypeFilter-indices')).toHaveTextContent('1')
    );

    await user.click(screen.getByTestId('searchBoostTypeFilter-data_streams'));
    await waitFor(() =>
      expect(getRows().map(([name]) => name)).toEqual(['_performant_data_streamsManaged'])
    );
  });

  it('shows profiles that arrive after the first render', async () => {
    const { rerender } = renderProfilesTab();
    await screen.findByText('catalog-fast');

    const newProfile = { ...findProfile('catalog-fast')!, name: 'new-profile', is_builtin: false };
    rerender(
      <I18nProvider>
        <ProfilesTab
          profiles={[...mockProfiles, newProfile]}
          rules={mockRules}
          getProfileLinkProps={() => ({ href: '#', onClick: jest.fn() })}
          getProfileRulesLinkProps={() => ({ href: '#', onClick: jest.fn() })}
        />
      </I18nProvider>
    );

    const row = await getRow('new-profile');
    expect(row).toHaveTextContent('Indices');
  });

  it('says when there are no profiles, keeping the create button', async () => {
    renderProfilesTab({ profiles: [], rules: [], canEdit: true, onCreate: jest.fn() });

    expect(await screen.findByText('No items found')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostCreateProfile')).toBeInTheDocument();
  });

  describe('actions', () => {
    it("doesn't show them to users who can't edit", async () => {
      renderProfilesTab({ onCreate: jest.fn(), onEdit: jest.fn() });

      await screen.findByText('catalog-fast');
      expect(screen.queryByTestId('searchBoostCreateProfile')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('calls back to create and edit, with edit disabled on managed profiles', async () => {
      const user = userEvent.setup();
      const onCreate = jest.fn();
      const onEdit = jest.fn();
      renderProfilesTab({ canEdit: true, onCreate, onEdit });

      await user.click(await screen.findByTestId('searchBoostCreateProfile'));
      expect(onCreate).toHaveBeenCalled();

      expect(
        within(await getRow('_performant_indices')).getByRole('button', { name: 'Edit' })
      ).toHaveAttribute('aria-disabled', 'true');

      await user.click(within(await getRow('catalog-fast')).getByRole('button', { name: 'Edit' }));
      expect(onEdit).toHaveBeenCalledWith(findProfile('catalog-fast'));
    });

    it('calls back to duplicate any profile', async () => {
      const onDuplicate = jest.fn();
      renderProfilesTab({ canEdit: true, onDuplicate });

      await userEvent.click(
        within(await getRow('_performant_indices')).getByRole('button', { name: 'Duplicate' })
      );
      expect(onDuplicate).toHaveBeenCalledWith(findProfile('_performant_indices'));
    });

    it('offers delete on custom profiles only', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();
      renderProfilesTab({ canEdit: true, onDelete });

      expect(
        within(await getRow('_performant_indices')).queryByRole('button', { name: 'Delete' })
      ).toBeNull();

      await user.click(
        within(await getRow('archive-cheap')).getByRole('button', { name: 'Delete' })
      );
      expect(onDelete).toHaveBeenCalledWith(findProfile('archive-cheap'));
    });

    it('disables delete for a custom profile a default rule uses', async () => {
      renderProfilesTab({
        canEdit: true,
        onDelete: jest.fn(),
        rules: [
          {
            name: '_default_indices',
            index_pattern: '*',
            boost_profile: 'catalog-fast',
            priority: -100,
            is_builtin: true,
          },
        ],
      });

      expect(
        within(await getRow('catalog-fast')).getByRole('button', { name: 'Delete' })
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
