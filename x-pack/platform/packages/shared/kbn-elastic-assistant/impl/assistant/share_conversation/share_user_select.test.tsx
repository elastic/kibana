/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShareUserSelect } from './share_user_select';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { welcomeConvo } from '../../mock/conversation';
import type { UserProfile } from '@kbn/core-user-profile-common';
jest.mock('./user_profiles_search', () => ({
  UserProfilesSearch: ({ onUsersSelect }: { onUsersSelect: (users: UserProfile[]) => void }) => (
    <button
      data-test-subj="UserProfilesSearch"
      type="button"
      onClick={() =>
        onUsersSelect([{ uid: 'user1', user: { username: 'User One' }, enabled: true, data: {} }])
      }
    >
      {'UserProfilesSearch'}
    </button>
  ),
}));
describe('ShareUserSelect', () => {
  const mockOnUsersUpdate = jest.fn();
  const testProps = {
    selectedConversation: welcomeConvo,
    onUsersUpdate: mockOnUsersUpdate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ShareUserSelect', () => {
    render(
      <TestProviders>
        <ShareUserSelect {...testProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('shareUserSelect')).toBeInTheDocument();
  });

  it('calls onUsersUpdate when users are selected', () => {
    render(
      <TestProviders>
        <ShareUserSelect {...testProps} />
      </TestProviders>
    );
    // Simulate user selection logic here if possible
    fireEvent.click(screen.getByTestId('UserProfilesSearch'));
    expect(mockOnUsersUpdate).toHaveBeenCalledWith([
      { id: 'user1', name: 'User One' },
      welcomeConvo.createdBy,
    ]);
  });
});
