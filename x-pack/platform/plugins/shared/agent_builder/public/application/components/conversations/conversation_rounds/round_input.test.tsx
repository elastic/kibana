/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ConversationRoundAuthor } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useUserProfiles } from '../../../hooks/use_user_profiles';
import { getInputAuthor, isCurrentUserAuthor } from './round_author';
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

describe('isCurrentUserAuthor', () => {
  it('matches a current user profile author by uid', () => {
    expect(isCurrentUserAuthor({ author: currentUser, currentUser })).toBe(true);
  });

  it('matches a persisted round author by id', () => {
    const author: ConversationRoundAuthor = {
      id: 'current-user',
      username: 'alice',
    };

    expect(isCurrentUserAuthor({ author, currentUser })).toBe(true);
  });

  it('returns false when the author does not match the current user', () => {
    const author: ConversationRoundAuthor = {
      id: 'other-user',
      username: 'elastic',
    };

    expect(isCurrentUserAuthor({ author, currentUser })).toBe(false);
  });
});

describe('getInputAuthor', () => {
  it('uses the current user as the author for local pending rounds without persisted author attribution', () => {
    expect(
      getInputAuthor({
        author: undefined,
        currentUser,
        isPendingCurrentRound: true,
      })
    ).toBe(currentUser);
  });

  it('keeps persisted author attribution when it exists', () => {
    const author: ConversationRoundAuthor = {
      id: 'other-user',
      username: 'elastic',
    };

    expect(
      getInputAuthor({
        author,
        currentUser,
        isPendingCurrentRound: true,
      })
    ).toBe(author);
  });

  it('does not use the current user for non-pending current rounds without persisted author attribution', () => {
    expect(
      getInputAuthor({
        author: undefined,
        currentUser,
        isPendingCurrentRound: false,
      })
    ).toBeUndefined();
  });
});

describe('RoundInput', () => {
  beforeEach(() => {
    mockUseCurrentUser.mockReturnValue({
      currentUser,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCurrentUser>);
    mockUseUserProfiles.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useUserProfiles>);
  });

  it('renders the avatar beside the authored input content', () => {
    render(
      <RoundInput
        input="Show me the preview"
        author={currentUser}
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
