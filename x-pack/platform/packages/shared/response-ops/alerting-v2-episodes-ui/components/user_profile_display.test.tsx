/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { I18nProvider } from '@kbn/i18n-react';
import { createQueryClientWrapper, createTestQueryClient } from '../hooks/test_utils';
import { UserProfileDisplay } from './user_profile_display';

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const mockBulkGet = jest.fn();
const mockUserProfile = { bulkGet: mockBulkGet } as unknown as UserProfileService;

describe('UserProfileDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the configured empty state without fetching a profile', () => {
    render(
      <I18nProvider>
        <UserProfileDisplay userProfileUid={null} userProfile={mockUserProfile} emptyState="—" />
      </I18nProvider>,
      { wrapper }
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(mockBulkGet).not.toHaveBeenCalled();
  });

  it('renders a skeleton while the profile is loading', () => {
    mockBulkGet.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <UserProfileDisplay userProfileUid="u-1" userProfile={mockUserProfile} />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2UserProfileDisplayLoading').querySelector('.euiSkeletonCircle')
    ).not.toBeNull();
  });

  it('renders the username once the profile loads', async () => {
    mockBulkGet.mockResolvedValue([{ uid: 'u-1', user: { username: 'jdoe' }, data: {} }] as never);

    render(
      <I18nProvider>
        <UserProfileDisplay userProfileUid="u-1" userProfile={mockUserProfile} />
      </I18nProvider>,
      { wrapper }
    );

    expect(await screen.findByText('jdoe')).toBeInTheDocument();
  });

  it('can keep the unknown-user tooltip out of the tab order', async () => {
    mockBulkGet.mockResolvedValue([]);

    render(
      <I18nProvider>
        <UserProfileDisplay
          userProfileUid="u-1"
          userProfile={mockUserProfile}
          isTooltipFocusable={false}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(await screen.findByText('Unknown user')).not.toHaveAttribute('tabindex');
  });
});
