/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CanvasFlyout } from './canvas_flyout';

const mockCloseCanvas = jest.fn();
let mockConversationId = 'conversation-1';

jest.mock('./canvas_context', () => ({
  useCanvasContext: () => ({
    canvasState: null,
    closeCanvas: mockCloseCanvas,
    setCanvasAttachmentOrigin: jest.fn(),
    updateCanvasAttachment: jest.fn(),
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
    conversation: null,
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
    mockConversationId = 'conversation-1';
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
});
