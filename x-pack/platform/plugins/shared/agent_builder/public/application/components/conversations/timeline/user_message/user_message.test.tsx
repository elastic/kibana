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
import { UserMessageAttachmentTiles } from './user_message_attachment_tiles';
import { isTileAttachment, useUserMessageFiles } from './use_user_message_files';
import { AttachmentReferences } from '../attachments/attachment_references';
import type { UserMessageFile } from './use_user_message_files';
import { useUserMessageThumbnails } from './use_user_message_thumbnails';
import type { UserMessageThumbnail } from './use_user_message_thumbnails';

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
  AttachmentReferences: jest.fn(() => <div data-test-subj="agentBuilderUserMessageAttachments" />),
}));

jest.mock('../../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(() => ({ isEmbeddedContext: false })),
}));

jest.mock('./user_message_attachment_tiles', () => ({
  UserMessageAttachmentTiles: jest.fn(() => <div data-test-subj="agentBuilderUserMessageTiles" />),
}));

jest.mock('./use_user_message_thumbnails');
jest.mock('./use_user_message_files');

const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseUserMessageThumbnails = jest.mocked(useUserMessageThumbnails);
const mockUseUserMessageFiles = jest.mocked(useUserMessageFiles);
const mockUseUserProfiles = jest.mocked(useUserProfiles);
const MockResponseActions = jest.mocked(ResponseActions);
const MockUserMessageAttachmentTiles = jest.mocked(UserMessageAttachmentTiles);
const MockAttachmentReferences = jest.mocked(AttachmentReferences);

const thumbnail: UserMessageThumbnail = {
  key: 'img1-v1',
  attachmentId: 'img1',
  thumbnailUrl: 'data:image/png;base64,abc',
  label: 'photo.png',
  name: 'photo.png',
};

const file: UserMessageFile = {
  key: 'doc1-v1',
  attachmentId: 'doc1',
  name: 'notes.md',
  mimeType: 'text/markdown',
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
    MockUserMessageAttachmentTiles.mockClear();
    mockUseUserMessageThumbnails.mockReturnValue([]);
    mockUseUserMessageFiles.mockReturnValue([]);
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

  it('renders UserMessageAttachmentTiles inside the panel when attachments are present', () => {
    render(
      <UserMessage
        input="Show me the preview"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
        attachmentRefs={[{ attachment_id: 'img1', version: 1 }]}
      />
    );

    expect(screen.getByTestId('agentBuilderUserMessageTiles')).toBeInTheDocument();
  });

  it('passes hoveredAttachmentName=null initially to UserMessageAttachmentTiles', () => {
    render(
      <UserMessage
        input="hello"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
        attachmentRefs={[{ attachment_id: 'img1', version: 1 }]}
      />
    );

    const [props] = MockUserMessageAttachmentTiles.mock.calls[0];
    expect(props.hoveredAttachmentName).toBeNull();
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
      expect(screen.queryByTestId('agentBuilderUserMessageTiles')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageActions')).not.toBeInTheDocument();
    });

    it('still renders the avatar, the author header and the attachments', () => {
      renderMessage('');

      expect(screen.getByTestId('agentBuilderUserMessageAvatar')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderUserMessageAttachments')).toBeInTheDocument();
    });

    it('keeps the bubble with the images when there are image thumbnails', () => {
      mockUseUserMessageThumbnails.mockReturnValue([thumbnail]);

      renderMessage('');

      expect(screen.getByLabelText('User input')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderUserMessageTiles')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageActions')).not.toBeInTheDocument();
    });

    it('keeps the bubble with the file tile when there is a document', () => {
      mockUseUserMessageFiles.mockReturnValue([file]);

      renderMessage('');

      expect(screen.getByLabelText('User input')).toBeInTheDocument();
      expect(screen.getByTestId('agentBuilderUserMessageTiles')).toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderUserMessageActions')).not.toBeInTheDocument();
    });
  });

  it('keeps the attachments that show as tiles out of the references list', () => {
    render(
      <UserMessage
        input="hello"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
      />
    );

    const [props] = MockAttachmentReferences.mock.calls[0];
    expect(props.isExcluded).toBe(isTileAttachment);
  });

  it('passes the files to UserMessageAttachmentTiles', () => {
    mockUseUserMessageFiles.mockReturnValue([file]);

    render(
      <UserMessage
        input="hello"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
      />
    );

    const [props] = MockUserMessageAttachmentTiles.mock.calls[0];
    expect(props.files).toEqual([file]);
  });

  it('passes the thumbnails to UserMessageAttachmentTiles', () => {
    mockUseUserMessageThumbnails.mockReturnValue([thumbnail]);

    render(
      <UserMessage
        input="hello"
        isPendingCurrentRound={false}
        startedAt="2026-01-01T00:00:00.000Z"
      />
    );

    const [props] = MockUserMessageAttachmentTiles.mock.calls[0];
    expect(props.thumbnails).toEqual([thumbnail]);
  });
});
