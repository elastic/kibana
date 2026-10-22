/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_INDICES_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_INDICES_RULE_NAME,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostProfile, BoostRule } from '../../../common/types';
import { DeleteProfileModal } from './delete_profile_modal';

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({ notifications: { toasts: { addSuccess: jest.fn() } } }),
}));

jest.mock('../../hooks/use_boost_state', () => ({
  useDeleteProfile: () => ({ mutate: jest.fn(), isLoading: false }),
}));

const [builtinIndicesProfile] = BUILTIN_PROFILES.filter(({ type }) => type === 'indices');
const profile: BoostProfile = {
  ...builtinIndicesProfile,
  name: 'catalog-search',
  is_builtin: false,
};

const rule = (name: string, pattern: string, profileName: string, priority: number): BoostRule => ({
  name,
  index_patterns: [pattern],
  boost_profile: profileName,
  priority,
  is_builtin: false,
});

describe('DeleteProfileModal', () => {
  it('lists the rule and profile each affected index will use', async () => {
    render(
      <IntlProvider locale="en">
        <DeleteProfileModal
          profile={profile}
          rules={[
            rule('catalogs', 'catalog-*', 'catalog-search', 2),
            rule('archives', '*-fall', BUILTIN_INDICES_PROFILE_NAMES.on_demand, 1),
            ...createDefaultRules(DEFAULT_RULE_PROFILES),
          ]}
          profiles={[...BUILTIN_PROFILES, profile]}
          dataSources={[
            { name: 'catalog-fall', type: 'index', size_in_bytes: 1e9 },
            { name: 'catalog-spring', type: 'index', size_in_bytes: 1e9 },
          ]}
          onClose={jest.fn()}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('deleteBoostProfileModal')).toHaveTextContent(
      'Deleting this profile will also delete the boost rule that uses it.'
    );
    const catalogs = within(screen.getByTestId('deletedRule-catalogs'));
    const toggle = catalogs.getByRole('button', { name: /catalogs/ });
    // The chevron at the row's end points down until the rule opens, then up.
    const getChevron = () => toggle.querySelector('[data-euiicon-type^="chevronSingle"]');
    expect(getChevron()).toHaveAttribute('data-euiicon-type', 'chevronSingleDown');
    await userEvent.click(toggle);
    expect(getChevron()).toHaveAttribute('data-euiicon-type', 'chevronSingleUp');

    const [header, ...rows] = within(catalogs.getByRole('table')).getAllByRole('row');
    expect(header).toHaveTextContent('Affected indexNew ruleNew profile');
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent)
      )
    ).toEqual([
      ['catalog-fall', 'archives', BUILTIN_INDICES_PROFILE_NAMES.on_demand],
      ['catalog-spring', DEFAULT_INDICES_RULE_NAME, BUILTIN_INDICES_PROFILE_NAMES.performant],
    ]);
  });
});
