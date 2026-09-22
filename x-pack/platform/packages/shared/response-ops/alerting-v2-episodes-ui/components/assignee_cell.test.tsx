/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { createQueryClientWrapper, createTestQueryClient } from '../hooks/test_utils';
import { AlertEpisodeAssigneeCell } from './assignee_cell';

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const mockBulkGet = jest.fn();
const mockUserProfile = { bulkGet: mockBulkGet } as unknown as UserProfileService;

describe('AlertEpisodeAssigneeCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders a skeleton while the assignee profile is loading', () => {
    mockBulkGet.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeAssigneeCell assigneeUid="u-1" userProfile={mockUserProfile} />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2EpisodeAssigneeCellLoading').querySelector('.euiSkeletonCircle')
    ).not.toBeNull();
  });

  it('renders the assignee username once the profile loads', async () => {
    mockBulkGet.mockResolvedValue([{ uid: 'u-1', user: { username: 'jdoe' }, data: {} }] as never);

    render(
      <I18nProvider>
        <AlertEpisodeAssigneeCell assigneeUid="u-1" userProfile={mockUserProfile} />
      </I18nProvider>,
      { wrapper }
    );

    expect(await screen.findByText('jdoe')).toBeInTheDocument();
  });
});
