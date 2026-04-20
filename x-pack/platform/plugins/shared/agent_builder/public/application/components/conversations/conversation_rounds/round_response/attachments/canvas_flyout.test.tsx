/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CanvasFlyout } from './canvas_flyout';

const mockCloseCanvas = jest.fn();
const mockSyncCanvasToVersion = jest.fn();
const mockSetPreviewedAttachmentKey = jest.fn();
let mockConversationId = 'conversation-1';
let mockCanvasState: any = null;
let mockConversation: any = null;

jest.mock('./canvas_context', () => ({
  getAttachmentPreviewKey: (attachmentId: string, version?: number) =>
    `${attachmentId}:${version ?? 'latest'}`,
  useCanvasContext: () => ({
    canvasState: mockCanvasState,
    closeCanvas: mockCloseCanvas,
    syncCanvasToVersion: mockSyncCanvasToVersion,
    setCanvasAttachmentOrigin: jest.fn(),
    setPreviewedAttachmentKey: mockSetPreviewedAttachmentKey,
  }),
}));

jest.mock('../../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: () => mockConversationId,
}));

jest.mock('../../../../../context/conversation/conversation_context', () => ({
  useConversationContext: () => ({
    conversationActions: { invalidateConversation: jest.fn() },
  }),
}));

jest.mock('../../../../../hooks/use_conversation', () => ({
  useConversation: () => ({
    conversation: mockConversation,
  }),
}));

jest.mock('../../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    openSidebarConversation: jest.fn(),
  }),
}));

jest.mock('../../../../../hooks/use_persisted_conversation_id', () => ({
  usePersistedConversationId: () => ({
    updatePersistedConversationId: jest.fn(),
  }),
}));

const mockAttachmentsService = {
  getAttachmentUiDefinition: jest.fn(),
  updateOrigin: jest.fn(),
} as any;

describe('CanvasFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncCanvasToVersion.mockImplementation((version: number, attachment: any) => {
      if (!mockCanvasState) {
        return;
      }
      mockCanvasState = {
        ...mockCanvasState,
        version,
        attachment,
      };
    });
    mockConversationId = 'conversation-1';
    mockCanvasState = null;
    mockConversation = null;
  });

  it('closes canvas when conversation ID changes', () => {
    const { rerender } = render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(mockCloseCanvas).not.toHaveBeenCalled();

    mockConversationId = 'conversation-2';
    rerender(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(mockCloseCanvas).toHaveBeenCalledTimes(1);
  });

  it('does not close canvas when conversation ID stays the same', () => {
    const { rerender } = render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    rerender(<CanvasFlyout attachmentsService={mockAttachmentsService} />);
    rerender(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(mockCloseCanvas).not.toHaveBeenCalled();
  });

  it('refreshes canvas content when following the latest attachment version', () => {
    mockCanvasState = {
      attachment: {
        id: 'attachment-1',
        type: 'test_attachment',
        data: { title: 'Version 1' },
      },
      isSidebar: false,
      version: 1,
      followsLatestVersion: true,
    };
    mockConversation = {
      attachments: [
        {
          id: 'attachment-1',
          type: 'test_attachment',
          current_version: 1,
          versions: [{ version: 1, data: { title: 'Version 1' } }],
        },
      ],
    };
    mockAttachmentsService.getAttachmentUiDefinition.mockReturnValue({
      getLabel: (attachment: { data: { title: string } }) => attachment.data.title,
      renderCanvasContent: ({ attachment }: { attachment: { data: { title: string } } }) => (
        <div>{attachment.data.title}</div>
      ),
    });

    const { rerender } = render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(screen.getByText('Version 1')).toBeInTheDocument();

    mockConversation = {
      attachments: [
        {
          id: 'attachment-1',
          type: 'test_attachment',
          current_version: 2,
          versions: [
            { version: 1, data: { title: 'Version 1' } },
            { version: 2, data: { title: 'Version 2' } },
          ],
        },
      ],
    };

    rerender(<CanvasFlyout attachmentsService={mockAttachmentsService} />);
    rerender(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(mockSetPreviewedAttachmentKey).toHaveBeenLastCalledWith('attachment-1:2');
  });
});
