/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_PROFILES,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  NO_CUSTOM_DEFAULTS,
  createDefaultRules,
  translateSimpleDefaults,
} from '../../../common/presets';
import type { BoostProfile, BoostState } from '../../../common/types';
import { ProfileFlyout } from './profile_flyout';

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

const usedProfile = customProfile('catalog-search');
const unusedProfile = customProfile('spare-search');

const state: BoostState = {
  settings: {
    mode: 'advanced',
    simple: DEFAULT_SIMPLE_MODE_DEFAULTS,
    custom_defaults: NO_CUSTOM_DEFAULTS,
  },
  profiles: [...BUILTIN_PROFILES, usedProfile, unusedProfile],
  rules: [
    ...createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS)),
    {
      name: 'catalogs',
      index_patterns: ['catalog-*'],
      boost_profile: usedProfile.name,
      priority: 1,
      is_builtin: false,
    },
  ],
  suspended_rules: [],
  data_sources: [
    { name: 'catalog-fall', type: 'index', size_in_bytes: 4e9 },
    { name: 'catalog-spring', type: 'index', size_in_bytes: 2e9 },
  ],
};

const mutation = { mutate: jest.fn(), isLoading: false };

jest.mock('../../hooks/use_boost_state', () => ({
  useBoostState: () => ({ data: state }),
  useCreateProfile: () => mutation,
  useUpdateProfile: () => mutation,
}));

jest.mock('../../hooks/use_boost_services', () => ({
  useBoostServices: () => ({ notifications: { toasts: { addSuccess: jest.fn() } } }),
}));

const renderFlyout = (profile?: BoostProfile) =>
  render(
    <IntlProvider locale="en">
      <ProfileFlyout
        profile={profile}
        takenNames={state.profiles.map(({ name }) => name)}
        onClose={jest.fn()}
      />
    </IntlProvider>
  );

describe('ProfileFlyout estimate', () => {
  const getEstimate = () => screen.queryByTestId('boostCostEstimate');

  it("has no estimate for a new profile, which doesn't apply to any data yet", () => {
    renderFlyout();

    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
  });

  it('has no estimate for a profile that no rule applies', () => {
    renderFlyout(unusedProfile);

    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
  });

  it("estimates an edit across the data the profile's rules apply to", async () => {
    renderFlyout(usedProfile);

    expect(getEstimate()).toHaveTextContent('2 indices · 6 GB');

    await userEvent.clear(screen.getByTestId('indicesMinBoost'));
    expect(getEstimate()).toHaveAttribute('data-stale', 'true');

    await userEvent.click(screen.getByTestId('boostProfileOption-prewarm'));
    expect(getEstimate()).toHaveAttribute('data-shown', 'false');
  });
});
