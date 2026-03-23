/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AttachmentVersion, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { useAttachmentLifecycle } from './use_attachment_lifecycle';
import type { AttachmentsService } from '../../services/attachments/attachements_service';

const createMockAttachment = (id: string, type: string = 'test_type'): VersionedAttachment => ({
  id,
  type,
  current_version: 1,
  versions: [{ version: 1, data: { content: 'test' }, content_hash: 'test' } as AttachmentVersion],
  origin: undefined,
  hidden: false,
});

const createMockAttachmentsService = (
  uiDefinitions: Record<string, Partial<AttachmentUIDefinition>>
): AttachmentsService =>
  ({
    getAttachmentUiDefinition: jest.fn((type: string) => uiDefinitions[type]),
  } as unknown as AttachmentsService);

const mockInvalidateConversation = jest.fn();

describe('useAttachmentLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onAttachmentMount for each new attachment', () => {
    const onAttachmentMount = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    renderHook(() =>
      useAttachmentLifecycle({
        attachments: [createMockAttachment('1'), createMockAttachment('2')],
        conversationId: 'conv-1',
        attachmentsService,
        invalidateConversation: mockInvalidateConversation,
      })
    );

    expect(onAttachmentMount).toHaveBeenCalledTimes(2);
  });

  it('does not call onAttachmentMount for existing attachments on rerender', () => {
    const onAttachmentMount = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    const { rerender } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
          invalidateConversation: mockInvalidateConversation,
        }),
      {
        initialProps: { attachments: [createMockAttachment('1')] },
      }
    );

    expect(onAttachmentMount).toHaveBeenCalledTimes(1);

    // Rerender with the same attachment
    rerender({ attachments: [createMockAttachment('1')] });

    expect(onAttachmentMount).toHaveBeenCalledTimes(1);
  });

  it('calls onAttachmentMount only for newly added attachments', () => {
    const onAttachmentMount = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    const { rerender } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
          invalidateConversation: mockInvalidateConversation,
        }),
      {
        initialProps: { attachments: [createMockAttachment('1')] },
      }
    );

    expect(onAttachmentMount).toHaveBeenCalledTimes(1);

    // Add a new attachment
    rerender({
      attachments: [createMockAttachment('1'), createMockAttachment('2')],
    });

    expect(onAttachmentMount).toHaveBeenCalledTimes(2);
    expect(onAttachmentMount).toHaveBeenLastCalledWith(
      expect.objectContaining({
        getAttachment: expect.any(Function),
      })
    );
  });

  it('calls cleanup for the correct attachment when one is removed', () => {
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();
    const onAttachmentMount = jest.fn().mockReturnValueOnce(cleanup1).mockReturnValueOnce(cleanup2);
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    const { rerender } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
          invalidateConversation: mockInvalidateConversation,
        }),
      {
        initialProps: {
          attachments: [createMockAttachment('1'), createMockAttachment('2')],
        },
      }
    );

    // Remove attachment '1', keep '2'
    rerender({ attachments: [createMockAttachment('2')] });

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).not.toHaveBeenCalled();
  });

  it('calls all cleanup functions on unmount', () => {
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();
    const onAttachmentMount = jest.fn().mockReturnValueOnce(cleanup1).mockReturnValueOnce(cleanup2);
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    const { unmount } = renderHook(() =>
      useAttachmentLifecycle({
        attachments: [createMockAttachment('1'), createMockAttachment('2')],
        conversationId: 'conv-1',
        attachmentsService,
        invalidateConversation: mockInvalidateConversation,
      })
    );

    expect(cleanup1).not.toHaveBeenCalled();
    expect(cleanup2).not.toHaveBeenCalled();

    unmount();

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
  });

  it('handles attachments without onAttachmentAdd defined', () => {
    const attachmentsService = createMockAttachmentsService({
      test_type: {},
    });

    expect(() =>
      renderHook(() =>
        useAttachmentLifecycle({
          attachments: [createMockAttachment('1')],
          conversationId: 'conv-1',
          attachmentsService,
          invalidateConversation: mockInvalidateConversation,
        })
      )
    ).not.toThrow();
  });

  it('handles attachments with unknown type', () => {
    const attachmentsService = createMockAttachmentsService({});

    expect(() =>
      renderHook(() =>
        useAttachmentLifecycle({
          attachments: [createMockAttachment('1', 'unknown_type')],
          conversationId: 'conv-1',
          attachmentsService,
          invalidateConversation: mockInvalidateConversation,
        })
      )
    ).not.toThrow();
  });

  it('handles onAttachmentMount returning undefined', () => {
    const onAttachmentMount = jest.fn().mockReturnValue(undefined);
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    const { rerender, unmount } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
          invalidateConversation: mockInvalidateConversation,
        }),
      {
        initialProps: { attachments: [createMockAttachment('1')] },
      }
    );

    // Should not throw when removing attachment without cleanup
    expect(() => rerender({ attachments: [] })).not.toThrow();

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });

  it('getAttachment returns current attachment state', () => {
    const onAttachmentMount = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentMount },
    });

    const attachment: VersionedAttachment = {
      id: '1',
      type: 'test_type',
      current_version: 2,
      versions: [
        { version: 1, data: { content: 'old' } } as AttachmentVersion,
        { version: 2, data: { content: 'current' } } as AttachmentVersion,
      ],
      origin: 'some-origin',
      hidden: true,
    };

    renderHook(() =>
      useAttachmentLifecycle({
        attachments: [attachment],
        conversationId: 'conv-1',
        attachmentsService,
        invalidateConversation: mockInvalidateConversation,
      })
    );

    expect(onAttachmentMount).toHaveBeenCalledWith({
      getAttachment: expect.any(Function),
      updateOrigin: expect.any(Function),
    });

    const { getAttachment } = onAttachmentMount.mock.calls[0][0];
    expect(getAttachment()).toEqual({
      id: '1',
      type: 'test_type',
      data: { content: 'current' },
      origin: 'some-origin',
      hidden: true,
    });
  });
});
