/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCurrentUser } from '../../../../hooks/use_current_user';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { UserMessage } from './user_message';
import { ResponseActions } from '../response/response_actions';
import { UserMessageImages } from './user_message_images';

jest.mock('../../../../hooks/use_current_user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('../../../../hooks/use_user_profiles', () => ({
  useUserProfiles: jest.fn(),
}));

jest.mock('../response/response_actions', () => ({
  ResponseActions: jest.fn(() => <div data-test-subj="agentBuilderUserMessageActions" />),
}));

jest.mock('../attachments/attachment_references', () => ({
  AttachmentReferences: () => <div data-test-subj="agentBuilderUserMessageAttachments" />,
}));

jest.mock('./user_message_images', () => ({
  UserMessageImages: jest.fn(() => <div data-test-subj="agentBuilderUserMessageImages" />),
}));

const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseUserProfiles = jest.mocked(useUserProfiles);
const MockResponseActions = jest.mocked(ResponseActions);
const MockUserMessageImages = jest.mocked(UserMessageImages);

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

describe('UserMessage', () => {
  beforeEach(() => {
    MockResponseActions.mockClear();
    MockUserMessageImages.mockClear();
    mockUseCurrentUser.mockReturnValue({
      currentUser,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCurrentUser>);
    mockUseUserProfiles.mockReturnValue({
      data: [currentUser],
    } as unknown as ReturnType<typeof useUserProfiles>);
  });

  it('tells ResponseActions to copy the prompt, not the response', () => {
    render(
      <UserMessage
        input="hello agent"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
      />
    );

    const [props] = MockResponseActions.mock.calls[0];
    expect(props.content).toBe('hello agent');
    expect(props.copyTarget).toBe('prompt');
  });

  it('renders the avatar beside the authored input content', () => {
    render(
      <UserMessage
        input="Show me the preview"
        author={{ id: 'current-user', username: 'alice', full_name: 'Alice Maria' }}
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
        attachmentRefs={[{ attachment_id: 'attachment-1', version: 1 }]}
      />
    );

    const layout = screen.getByTestId('agentBuilderUserMessageLayout');
    const avatar = screen.getByTestId('agentBuilderUserMessageAvatar');
    const content = screen.getByTestId('agentBuilderUserMessageContent');

    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(content).toContainElement(screen.getByText('Alice Maria'));
    expect(content).toContainElement(screen.getByText('Show me the preview'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderUserMessageAttachments'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderUserMessageActions'));
    expect(layout.firstElementChild).toBe(avatar);
    expect(avatar.nextElementSibling).toBe(content);
  });

  it('renders UserMessageImages inside the panel when attachments are present', () => {
    render(
      <UserMessage
        input="Show me the preview"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
        attachmentRefs={[{ attachment_id: 'img1', version: 1 }]}
      />
    );

    expect(screen.getByTestId('agentBuilderUserMessageImages')).toBeInTheDocument();
  });

  it('passes hoveredImageName=null initially to UserMessageImages', () => {
    render(
      <UserMessage
        input="hello"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
        attachmentRefs={[{ attachment_id: 'img1', version: 1 }]}
      />
    );

    const [props] = MockUserMessageImages.mock.calls[0];
    expect(props.hoveredImageName).toBeNull();
  });
});
