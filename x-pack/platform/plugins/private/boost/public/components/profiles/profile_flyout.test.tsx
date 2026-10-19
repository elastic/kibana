/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BUILTIN_PROFILES } from '../../../common/presets';
import type { BoostProfile } from '../../../common/types';
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

jest.mock('../../hooks/use_boost_state', () => ({
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
  // A profile can apply through any number of rules, so only one created for a rule, in the rule
  // flyout, has an estimate: of that rule's targets.
  it('has no estimate for a new or saved profile', () => {
    const { unmount } = renderFlyout();
    expect(screen.queryByTestId('boostCostEstimate')).not.toBeInTheDocument();
    unmount();

    renderFlyout(savedProfile);
    expect(screen.queryByTestId('boostCostEstimate')).not.toBeInTheDocument();
  });
});
