/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

const mutation = { mutate: jest.fn(), isLoading: false };

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
