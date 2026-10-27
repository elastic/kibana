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
  BUILTIN_PROFILES,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostProfile, BoostState } from '../../../common/types';
import { ProfileFlyout } from './profile_flyout';

const savedProfile: BoostProfile = {
  name: 'catalog-search',
  type: 'indices',
  is_builtin: false,
  min_boost: 1,
  max_boost: 4,
  high_availability: 'none',
  prewarm: false,
  pinned: false,
};

const createMutation = { mutate: jest.fn(), isLoading: false };
const updateMutation = { mutate: jest.fn(), isLoading: false };

// A rule applies the saved profile to one index.
const createState = (patterns: string[]): BoostState => ({
  settings: { default_profiles: DEFAULT_RULE_PROFILES },
  profiles: [...BUILTIN_PROFILES, savedProfile],
  rules: [
    {
      name: 'catalogs',
      index_patterns: patterns,
      boost_profile: savedProfile.name,
      priority: 1,
      is_builtin: false,
    },
    ...createDefaultRules(DEFAULT_RULE_PROFILES),
  ],
  data_sources: [{ name: 'catalog-fall', type: 'index', size_in_bytes: 4e9 }],
});

let mockState = createState(['catalog-*']);

jest.mock('../../hooks/use_boost_state', () => ({
  useBoostState: () => ({ data: mockState }),
  useCreateProfile: () => createMutation,
  useUpdateProfile: () => updateMutation,
}));

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({ notifications: { toasts: { addSuccess: jest.fn() } } }),
}));

const renderFlyout = (profile?: BoostProfile) =>
  render(
    <IntlProvider locale="en">
      <ProfileFlyout
        profile={profile}
        takenNames={[...BUILTIN_PROFILES, savedProfile].map(({ name }) => name)}
        onClose={jest.fn()}
      />
    </IntlProvider>
  );

describe('ProfileFlyout estimate', () => {
  beforeEach(() => {
    mockState = createState(['catalog-*']);
  });

  it('has no estimate for a new profile, which no rule uses yet', () => {
    renderFlyout();
    expect(screen.queryByTestId('boostCostEstimate')).not.toBeInTheDocument();
  });

  it('estimates an edit across what rules apply the profile to', () => {
    renderFlyout(savedProfile);
    expect(screen.getByTestId('boostCostEstimateCount')).toHaveTextContent('1 index');
    expect(screen.getByTestId('boostCostEstimateSize')).toHaveTextContent('4 GB');
  });

  it('has no estimate for an edit to a profile that applies to nothing', () => {
    mockState = createState(['nothing-*']);
    renderFlyout(savedProfile);
    expect(screen.queryByTestId('boostCostEstimateCount')).not.toBeInTheDocument();
  });
});

describe('ProfileFlyout options', () => {
  // A checkbox card's test subject is on its checkbox.
  const getOption = (key: string) => screen.getByTestId(`boostProfileOption-${key}`);

  it('only lets prewarmed data be pinned, and turns pinned off with prewarm', async () => {
    renderFlyout();

    // A new profile doesn't prewarm, so it can't be pinned either, and says why.
    expect(getOption('pinned')).toBeDisabled();
    expect(getOption('pinned')).toHaveAccessibleName(
      'Pinned Protect cached data in proportion to min boost. Turn on prewarm to protect cached data.'
    );

    await userEvent.click(getOption('prewarm'));
    expect(getOption('pinned')).toBeEnabled();
    await userEvent.click(getOption('pinned'));
    expect(getOption('pinned')).toBeChecked();

    await userEvent.click(getOption('prewarm'));
    expect(getOption('pinned')).not.toBeChecked();
    expect(getOption('pinned')).toBeDisabled();

    // Turning prewarm back on leaves pinned for the user to turn on again.
    await userEvent.click(getOption('prewarm'));
    expect(getOption('pinned')).toBeEnabled();
    expect(getOption('pinned')).not.toBeChecked();
  });

  it('opens a saved profile that pins without prewarm with pinned off', () => {
    renderFlyout({ ...savedProfile, prewarm: false, pinned: true });

    expect(getOption('pinned')).not.toBeChecked();
    expect(getOption('pinned')).toBeDisabled();
  });
});

describe('ProfileFlyout saving changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = createState(['catalog-*']);
  });

  const changeMaxBoost = async () => {
    const input = screen.getByTestId('indicesMaxBoost');
    await userEvent.clear(input);
    await userEvent.type(input, '6');
  };

  it('confirms changes to a profile that applies to something, listing what and through which rule', async () => {
    renderFlyout(savedProfile);
    await changeMaxBoost();
    await userEvent.click(screen.getByTestId('boostProfileSave'));

    const modal = screen.getByTestId('boostProfileChangesModal');
    expect(modal).toHaveTextContent(
      'Update boost profile "catalog-search"?This profile applies to 1 index, which these changes apply to as well.'
    );
    const [, row] = within(modal).getAllByRole('row');
    expect(row).toHaveTextContent('catalog-fallcatalogs');
    expect(updateMutation.mutate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('boostProfileConfirmSave'));
    expect(updateMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'catalog-search', max_boost: 6 }),
      expect.anything()
    );
    expect(createMutation.mutate).not.toHaveBeenCalled();
  });

  it('saves the changes as a new profile instead, under a name no other profile has', async () => {
    renderFlyout(savedProfile);
    await changeMaxBoost();
    await userEvent.click(screen.getByTestId('boostProfileSave'));
    await userEvent.click(screen.getByTestId('boostProfileSaveAsNew'));

    const name = screen.getByTestId('boostProfileNewName');
    expect(name).toHaveValue('catalog-search-copy');
    expect(name).toHaveFocus();
    await userEvent.clear(name);
    await userEvent.type(name, 'catalog-search');
    await userEvent.click(screen.getByTestId('boostProfileSaveAsNewConfirm'));
    expect(screen.getByTestId('boostProfileChangesModal')).toHaveTextContent(
      'A boost profile with this name already exists.'
    );
    expect(createMutation.mutate).not.toHaveBeenCalled();

    await userEvent.clear(name);
    await userEvent.type(name, 'catalog-search-fast{Enter}');
    expect(createMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'catalog-search-fast', max_boost: 6 }),
      expect.anything()
    );
    expect(updateMutation.mutate).not.toHaveBeenCalled();
  });

  it('goes back from naming a new profile, and cancels without saving', async () => {
    renderFlyout(savedProfile);
    await changeMaxBoost();
    await userEvent.click(screen.getByTestId('boostProfileSave'));
    await userEvent.click(screen.getByTestId('boostProfileSaveAsNew'));
    await userEvent.click(screen.getByTestId('boostProfileChangesBack'));
    expect(screen.getByTestId('boostProfileConfirmSave')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('boostProfileChangesCancel'));
    expect(screen.queryByTestId('boostProfileChangesModal')).not.toBeInTheDocument();
    expect(updateMutation.mutate).not.toHaveBeenCalled();
    expect(createMutation.mutate).not.toHaveBeenCalled();
  });

  it('saves without asking when nothing changed, or when the profile applies to nothing', async () => {
    const { unmount } = renderFlyout(savedProfile);
    await userEvent.click(screen.getByTestId('boostProfileSave'));
    expect(screen.queryByTestId('boostProfileChangesModal')).not.toBeInTheDocument();
    expect(updateMutation.mutate).toHaveBeenCalledTimes(1);
    unmount();

    mockState = createState(['nothing-*']);
    renderFlyout(savedProfile);
    await changeMaxBoost();
    await userEvent.click(screen.getByTestId('boostProfileSave'));
    expect(screen.queryByTestId('boostProfileChangesModal')).not.toBeInTheDocument();
    expect(updateMutation.mutate).toHaveBeenCalledTimes(2);
  });
});
