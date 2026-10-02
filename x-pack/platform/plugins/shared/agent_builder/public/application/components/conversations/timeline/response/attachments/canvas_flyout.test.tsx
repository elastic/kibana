/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { render, screen, fireEvent } from '@testing-library/react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { CanvasFlyout } from './canvas_flyout';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const { createElement } = jest.requireActual('react');
  return { ...actual, EuiFlyout: jest.fn((props) => createElement(actual.EuiFlyout, props)) };
});

const mockCloseCanvas = jest.fn();
const mockOpenSidebarConversation = jest.fn();
let mockConversationId: string | undefined = 'conversation-1';
let mockIsEmbeddedContext = false;
let mockCanvasState: {
  attachment: UnknownAttachment;
  isSidebar: boolean;
  version?: number;
} | null = null;

jest.mock('./canvas_context', () => ({
  useCanvasContext: () => ({
    canvasState: mockCanvasState,
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
    isEmbeddedContext: mockIsEmbeddedContext,
    conversationActions: { invalidateConversation: jest.fn() },
  }),
}));

jest.mock('../../../../../hooks/use_conversation', () => ({
  useConversation: () => ({
    conversation: null,
  }),
  useAgentId: () => 'agent-1',
}));

jest.mock('../../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    openSidebarConversation: mockOpenSidebarConversation,
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
    mockIsEmbeddedContext = false;
    mockCanvasState = null;
  });

  describe('flyout session', () => {
    const renderCanvas = ({ isSidebar }: { isSidebar: boolean }) => {
      mockIsEmbeddedContext = isSidebar;
      mockAttachmentsService.getAttachmentUiDefinition.mockReturnValue({
        getLabel: () => 'Test attachment',
        renderCanvasContent: () => <div>canvas body</div>,
      });
      mockCanvasState = {
        attachment: { id: 'attachment-1', type: 'test', data: {} },
        isSidebar,
      };
      render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);
      const [props] = jest.mocked(EuiFlyout).mock.lastCall ?? [];
      return props;
    };

    it('stacks in the shared conversation flyout session in full screen', () => {
      const props = renderCanvas({ isSidebar: false });

      expect(props).toEqual(
        expect.objectContaining({
          session: 'start',
          historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
          outsideClickCloses: false,
          flyoutMenuProps: { title: 'Attachment preview' },
        })
      );
    });

    it('stays unmanaged and closes on outside click in the sidebar', () => {
      const props = renderCanvas({ isSidebar: true });

      expect(props?.session).toBeUndefined();
      expect(props?.historyKey).toBeUndefined();
      expect(props?.outsideClickCloses).toBe(true);
    });
  });

  it('shows a fallback instead of crashing when renderCanvasContent throws', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockAttachmentsService.getAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'Test attachment',
      renderCanvasContent: () => {
        throw new Error('boom');
      },
    });
    mockCanvasState = {
      attachment: { id: 'attachment-1', type: 'test', data: {} },
      isSidebar: false,
    };

    render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(screen.getByText("Couldn't render this attachment")).not.toBeNull();
  });

  it.each([
    [undefined, '12px'],
    [true, '0px'],
  ])(
    'sets the body top padding when canvasHideTopPadding is %s',
    (canvasHideTopPadding, paddingTop) => {
      mockAttachmentsService.getAttachmentUiDefinition.mockReturnValue({
        getLabel: () => 'Test attachment',
        renderCanvasContent: () => <div data-test-subj="canvasContent" />,
        canvasHideTopPadding,
      });
      mockCanvasState = {
        attachment: { id: 'attachment-1', type: 'test', data: {} },
        isSidebar: false,
      };

      render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

      const body = screen.getByTestId('canvasContent').closest('.euiFlyoutBody');
      expect(body).not.toBeNull();
      expect(window.getComputedStyle(body as Element).paddingTop).toBe(paddingTop);
    }
  );

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

  describe('openSidebarConversation prop forwarded to canvas content', () => {
    // Fake canvas content with a button wired to `props.openSidebarConversation`. Clicking
    // the button stands in for any real attachment-content control that wants to open the
    // sidebar — letting the test assert what the closure does on invocation.
    const TRIGGER_LABEL = 'fake-open-sidebar';

    const renderWithFakeCanvas = ({ isSidebar = false }: { isSidebar?: boolean } = {}) => {
      mockIsEmbeddedContext = isSidebar;
      mockAttachmentsService.getAttachmentUiDefinition.mockReturnValue({
        getLabel: () => 'Test attachment',
        renderCanvasContent: (props: AttachmentRenderProps<UnknownAttachment>) => (
          <button type="button" onClick={props.openSidebarConversation}>
            {TRIGGER_LABEL}
          </button>
        ),
      });
      mockCanvasState = {
        attachment: { id: 'attachment-1', type: 'test', data: {} },
        isSidebar,
      };
      return render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);
    };

    it('invokes openSidebarConversationInternal with the active conversationId when triggered from canvas content', () => {
      renderWithFakeCanvas({ isSidebar: false });

      fireEvent.click(screen.getByRole('button', { name: TRIGGER_LABEL }));

      expect(mockOpenSidebarConversation).toHaveBeenCalledTimes(1);
      expect(mockOpenSidebarConversation).toHaveBeenCalledWith({
        conversationId: 'conversation-1',
      });
    });

    it('does not invoke openSidebarConversationInternal when rendered inside the sidebar', () => {
      renderWithFakeCanvas({ isSidebar: true });

      fireEvent.click(screen.getByRole('button', { name: TRIGGER_LABEL }));

      expect(mockOpenSidebarConversation).not.toHaveBeenCalled();
    });
  });

  it('forwards closeCanvas to getActionButtons when rendering canvas header actions', () => {
    const getActionButtons = jest.fn().mockReturnValue([]);
    mockAttachmentsService.getAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'Test attachment',
      renderCanvasContent: () => <div>canvas body</div>,
      getActionButtons,
    });
    mockCanvasState = {
      attachment: { id: 'attachment-1', type: 'test', data: {} },
      isSidebar: false,
    };

    render(<CanvasFlyout attachmentsService={mockAttachmentsService} />);

    expect(getActionButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        isCanvas: true,
        closeCanvas: mockCloseCanvas,
      })
    );
  });
});
