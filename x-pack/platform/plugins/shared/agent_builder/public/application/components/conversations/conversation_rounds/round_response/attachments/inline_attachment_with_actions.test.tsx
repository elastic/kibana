/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { InlineAttachmentWithActions } from './inline_attachment_with_actions';

const mockOpenCanvas = jest.fn();
const mockSetPreviewedAttachmentKey = jest.fn();
const mockInvalidateConversation = jest.fn();
const mockOpenSidebarConversation = jest.fn();

jest.mock('./canvas_context', () => ({
  getAttachmentPreviewKey: (attachmentId: string, version?: number) =>
    `${attachmentId}:${version ?? 'latest'}`,
  useCanvasContext: () => ({
    openCanvas: mockOpenCanvas,
    previewedAttachmentKey: null,
    setPreviewedAttachmentKey: mockSetPreviewedAttachmentKey,
  }),
}));

jest.mock('../../../../../context/conversation/conversation_context', () => ({
  useConversationContext: () => ({
    conversationActions: { invalidateConversation: mockInvalidateConversation },
  }),
}));

jest.mock('../../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    openSidebarConversation: mockOpenSidebarConversation,
  }),
}));

const dynamicActionHandler = jest.fn();

const DynamicInlineContent = ({ callbacks }: { callbacks?: InlineRenderCallbacks }) => {
  const { registerActionButtons } = callbacks ?? {};

  useEffect(() => {
    registerActionButtons?.([
      {
        label: 'Dynamic action',
        type: ActionButtonType.PRIMARY,
        handler: dynamicActionHandler,
      },
    ]);
  }, [registerActionButtons]);

  return <div>Inline content</div>;
};

describe('InlineAttachmentWithActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders action buttons registered by inline content', async () => {
    const attachment: UnknownAttachment = { id: 'attachment-1', type: 'test', data: {} };
    const attachmentsService = {
      getAttachmentUiDefinition: jest.fn().mockReturnValue({
        getLabel: () => 'Test attachment',
        renderInlineContent: (
          _props: AttachmentRenderProps<UnknownAttachment>,
          callbacks?: InlineRenderCallbacks
        ) => <DynamicInlineContent callbacks={callbacks} />,
        getActionButtons: () => [
          {
            label: 'Static action',
            type: ActionButtonType.SECONDARY,
            handler: jest.fn(),
          },
        ],
      }),
      updateOrigin: jest.fn(),
    };

    render(
      <InlineAttachmentWithActions
        attachment={attachment}
        attachmentsService={attachmentsService as unknown as AttachmentsService}
        conversationId="conversation-1"
        isSidebar={false}
      />
    );

    expect(screen.getByText('Inline content')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Static action' })).not.toBeNull();
    expect(await screen.findByRole('button', { name: 'Dynamic action' })).not.toBeNull();
  });

  describe('openSidebarConversation prop forwarded to inline content and action buttons', () => {
    // Two fake triggers — one rendered by `renderInlineContent`, one by `getActionButtons` —
    // each wired to its own `openSidebarConversation`. Clicking either stands in for any real
    // attachment control that wants to open the sidebar.
    const INLINE_TRIGGER = 'fake-inline-trigger';
    const ACTION_TRIGGER = 'fake-action-trigger';

    const renderWithFakeContent = ({ isSidebar }: { isSidebar: boolean }) => {
      const attachment: UnknownAttachment = { id: 'attachment-1', type: 'test', data: {} };
      const attachmentsService = {
        getAttachmentUiDefinition: jest.fn().mockReturnValue({
          getLabel: () => 'Test attachment',
          renderInlineContent: (props: AttachmentRenderProps<UnknownAttachment>) => (
            <button type="button" onClick={props.openSidebarConversation}>
              {INLINE_TRIGGER}
            </button>
          ),
          getActionButtons: ({
            openSidebarConversation,
          }: {
            openSidebarConversation?: () => void;
          }) =>
            openSidebarConversation
              ? [
                  {
                    label: ACTION_TRIGGER,
                    type: ActionButtonType.SECONDARY,
                    handler: openSidebarConversation,
                  },
                ]
              : [],
        }),
        updateOrigin: jest.fn(),
      };

      render(
        <InlineAttachmentWithActions
          attachment={attachment}
          attachmentsService={attachmentsService as unknown as AttachmentsService}
          conversationId="conversation-1"
          isSidebar={isSidebar}
        />
      );
    };

    it('invokes openSidebarConversationInternal when triggered from inline content', () => {
      renderWithFakeContent({ isSidebar: false });

      fireEvent.click(screen.getByRole('button', { name: INLINE_TRIGGER }));

      expect(mockOpenSidebarConversation).toHaveBeenCalledTimes(1);
      expect(mockOpenSidebarConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-1',
      });
    });

    it('invokes openSidebarConversationInternal when triggered from an action button', () => {
      renderWithFakeContent({ isSidebar: false });

      fireEvent.click(screen.getByRole('button', { name: ACTION_TRIGGER }));

      expect(mockOpenSidebarConversation).toHaveBeenCalledTimes(1);
      expect(mockOpenSidebarConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-1',
      });
    });

    it('does not invoke openSidebarConversationInternal when rendered inside the sidebar', () => {
      renderWithFakeContent({ isSidebar: true });

      // The action button is gated off entirely when openSidebarConversation is undefined.
      expect(screen.queryByRole('button', { name: ACTION_TRIGGER })).toBeNull();

      // The inline trigger is still rendered, but clicking it is a no-op.
      fireEvent.click(screen.getByRole('button', { name: INLINE_TRIGGER }));
      expect(mockOpenSidebarConversation).not.toHaveBeenCalled();
    });
  });
});
