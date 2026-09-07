/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useUserProfiles } from '../../../hooks/use_user_profiles';
import { RoundInput } from './round_input';

jest.mock('../../../hooks/use_current_user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('../../../hooks/use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

jest.mock('./round_response/round_response_actions', () => ({
  RoundResponseActions: () => <div data-test-subj="agentBuilderRoundInputActions" />,
}));

jest.mock('./round_attachment_references', () => ({
  RoundAttachmentReferences: () => <div data-test-subj="agentBuilderRoundInputAttachments" />,
}));

const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseUserProfiles = jest.mocked(useUserProfiles);

const currentUser = {
  uid: 'current-user',
  enabled: true,
  user: {
    username: 'alice',
    full_name: 'Alice Maria',
  },
  data: {
    avatar: {
      initials: 'AM',
    },
  },
} as UserProfileWithAvatar;

describe('RoundInput', () => {
  beforeEach(() => {
    mockUseCurrentUser.mockReturnValue({
      currentUser,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCurrentUser>);
    mockUseUserProfiles.mockReturnValue({
      data: [currentUser],
    } as unknown as ReturnType<typeof useUserProfiles>);
  });

  it('renders the avatar beside the authored input content', () => {
    render(
      <RoundInput
        input="Show me the preview"
        author={{ id: 'current-user', username: 'alice', full_name: 'Alice Maria' }}
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
        attachmentRefs={[{ attachment_id: 'attachment-1', version: 1 }]}
      />
    );

    const layout = screen.getByTestId('agentBuilderRoundInputLayout');
    const avatar = screen.getByTestId('agentBuilderRoundInputAvatar');
    const content = screen.getByTestId('agentBuilderRoundInputContent');

    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(content).toContainElement(screen.getByText('Alice Maria'));
    expect(content).toContainElement(screen.getByText('Show me the preview'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderRoundInputAttachments'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderRoundInputActions'));
    expect(layout.firstElementChild).toBe(avatar);
    expect(avatar.nextElementSibling).toBe(content);
  });
});
