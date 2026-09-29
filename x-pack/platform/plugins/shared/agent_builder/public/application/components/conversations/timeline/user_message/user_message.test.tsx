/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCurrentUser } from '../../../../hooks/use_current_user';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { UserMessage } from './user_message';
import { ResponseActions } from '../response/response_actions';
import { UserMessageImages } from './user_message_images';

vi.mock('../../../../hooks/use_current_user', () => {
      const mocked = {
      useCurrentUser: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../hooks/use_user_profiles', () => {
      const mocked = {
      useUserProfiles: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../response/response_actions', () => {
      const mocked = {
      ResponseActions: vi.fn(() => <div data-test-subj="agentBuilderUserMessageActions" />),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../attachments/attachment_references', () => {
      const mocked = {
      AttachmentReferences: () => <div data-test-subj="agentBuilderUserMessageAttachments" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./user_message_images', () => {
      const mocked = {
      UserMessageImages: vi.fn(() => <div data-test-subj="agentBuilderUserMessageImages" />),
    };
      return { ...mocked, default: mocked };
    });

const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockUseUserProfiles = vi.mocked(useUserProfiles);
const MockResponseActions = vi.mocked(ResponseActions);
const MockUserMessageImages = vi.mocked(UserMessageImages);

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
