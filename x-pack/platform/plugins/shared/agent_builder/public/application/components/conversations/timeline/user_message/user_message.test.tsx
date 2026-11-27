/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { useHasMultipleAuthors } from '../../../../hooks/use_has_multiple_authors';
import { useCurrentUser } from '../../../../hooks/use_current_user';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { UserMessage } from './user_message';
import { ResponseActions } from '../response/response_actions';
import { UserMessageImages } from './user_message_images';
import { useUserMessageThumbnails } from './use_user_message_thumbnails';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';

jest.mock('../../../../hooks/use_current_user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('../../../../hooks/use_has_multiple_authors', () => ({
  useHasMultipleAuthors: jest.fn(),
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

jest.mock('../../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(() => ({ isEmbeddedContext: false })),
}));

jest.mock('./user_message_images', () => ({
  UserMessageImages: jest.fn(() => <div data-test-subj="agentBuilderUserMessageImages" />),
}));

jest.mock('./use_user_message_thumbnails');

const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseHasMultipleAuthors = jest.mocked(useHasMultipleAuthors);
const mockUseUserMessageThumbnails = jest.mocked(useUserMessageThumbnails);
const mockUseUserProfiles = jest.mocked(useUserProfiles);
const MockResponseActions = jest.mocked(ResponseActions);
const MockUserMessageImages = jest.mocked(UserMessageImages);

const thumbnail: UserMessageThumbnail = {
  key: 'img1-v1',
  attachmentId: 'img1',
  thumbnailUrl: 'data:image/png;base64,abc',
  label: 'photo.png',
  name: 'photo.png',
};

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
    mockUseUserMessageThumbnails.mockReturnValue([]);
    mockUseHasMultipleAuthors.mockReturnValue(false);
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

  describe('author line', () => {
    const renderAuthoredMessage = (props: Partial<React.ComponentProps<typeof UserMessage>> = {}) =>
      render(
        <UserMessage
          input="Show me the preview"
          author={{ id: 'current-user', username: 'alice', full_name: 'Alice Maria' }}
          isPendingCurrentRound={false}
          startedAt="2026-01-01T00:00:00.000Z"
          attachmentRefs={[{ attachment_id: 'attachment-1', version: 1 }]}
          {...props}
        />
      );

    it('does not name the author while one person has written every message', () => {
      renderAuthoredMessage();

      expect(screen.queryByTestId('agentBuilderUserMessageAuthor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageAvatar')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Maria')).not.toBeInTheDocument();
      expect(screen.getByText('Show me the preview')).toBeInTheDocument();
    });

    it('names the author above the bubble once several people have written', () => {
      mockUseHasMultipleAuthors.mockReturnValue(true);

      renderAuthoredMessage();

      const layout = screen.getByTestId('agentBuilderUserMessageLayout');
      const author = screen.getByTestId('agentBuilderUserMessageAuthor');
      const content = screen.getByTestId('agentBuilderUserMessageContent');

      expect(author).toContainElement(screen.getByText('AM'));
      expect(author).toContainElement(screen.getByText('Alice Maria'));
      expect(content).toContainElement(screen.getByText('Show me the preview'));
      expect(content).not.toContainElement(author);
      expect(layout.firstElementChild).toContainElement(author);
    });

    it('names the author of a message from an external system even when they are the only one', () => {
      // An external author has no Kibana profile.
      mockUseUserProfiles.mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useUserProfiles>);

      renderAuthoredMessage({
        author: { id: 'U123', username: 'bob' },
        origin: { type: ConversationOriginType.Slack },
      });

      const author = screen.getByTestId('agentBuilderUserMessageAuthor');

      expect(author).toContainElement(screen.getByText('bob'));
      expect(author).toContainElement(screen.getByText('via Slack'));
    });
  });

  it('keeps the time and the copy action outside the bubble', () => {
    render(
      <UserMessage
        input="Show me the preview"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
      />
    );

    const content = screen.getByTestId('agentBuilderUserMessageContent');

    expect(content).not.toContainElement(screen.getByTestId('agentBuilderUserMessageTime'));
    expect(content).not.toContainElement(screen.getByTestId('agentBuilderUserMessageActions'));
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

  describe('when the message has no text', () => {
    const renderMessage = (input: string) =>
      render(
        <UserMessage
          input={input}
          isPendingCurrentRound={false}
          startedAt="2026-01-01T00:00:00.000Z"
          attachmentRefs={[{ attachment_id: 'txt1', version: 1 }]}
        />
      );

    it.each([
      ['an empty string', ''],
      ['only whitespace', '  \n '],
    ])('hides the bubble and the copy button when the text is %s', (_, input) => {
      renderMessage(input);

      expect(screen.queryByLabelText('User input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageImages')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageActions')).not.toBeInTheDocument();
    });

    it('still renders the time and the attachments', () => {
      renderMessage('');

      expect(screen.getByTestId('agentBuilderUserMessageTime')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderUserMessageAttachments')).toBeInTheDocument();
    });

    it('keeps the bubble with the images when there are image thumbnails', () => {
      mockUseUserMessageThumbnails.mockReturnValue([thumbnail]);

      renderMessage('');

      expect(screen.getByLabelText('User input')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderUserMessageImages')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageActions')).not.toBeInTheDocument();
    });
  });

  it('passes the thumbnails to UserMessageImages', () => {
    mockUseUserMessageThumbnails.mockReturnValue([thumbnail]);

    render(
      <UserMessage
        input="hello"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
      />
    );

    const [props] = MockUserMessageImages.mock.calls[0];
    expect(props.thumbnails).toEqual([thumbnail]);
  });
});
