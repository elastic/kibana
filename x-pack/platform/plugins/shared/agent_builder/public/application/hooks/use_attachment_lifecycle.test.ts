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

describe('useAttachmentLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onAttachmentAdd for each new attachment', () => {
    const onAttachmentAdd = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
    });

    renderHook(() =>
      useAttachmentLifecycle({
        attachments: [createMockAttachment('1'), createMockAttachment('2')],
        conversationId: 'conv-1',
        attachmentsService,
      })
    );

    expect(onAttachmentAdd).toHaveBeenCalledTimes(2);
  });

  it('does not call onAttachmentAdd for existing attachments on rerender', () => {
    const onAttachmentAdd = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
    });

    const { rerender } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
        }),
      {
        initialProps: { attachments: [createMockAttachment('1')] },
      }
    );

    expect(onAttachmentAdd).toHaveBeenCalledTimes(1);

    // Rerender with the same attachment
    rerender({ attachments: [createMockAttachment('1')] });

    expect(onAttachmentAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onAttachmentAdd only for newly added attachments', () => {
    const onAttachmentAdd = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
    });

    const { rerender } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
        }),
      {
        initialProps: { attachments: [createMockAttachment('1')] },
      }
    );

    expect(onAttachmentAdd).toHaveBeenCalledTimes(1);

    // Add a new attachment
    rerender({
      attachments: [createMockAttachment('1'), createMockAttachment('2')],
    });

    expect(onAttachmentAdd).toHaveBeenCalledTimes(2);
    expect(onAttachmentAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attachment: expect.objectContaining({ id: '2' }),
      })
    );
  });

  it('calls cleanup for the correct attachment when one is removed', () => {
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();
    const onAttachmentAdd = jest.fn().mockReturnValueOnce(cleanup1).mockReturnValueOnce(cleanup2);
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
    });

    const { rerender } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
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
    const onAttachmentAdd = jest.fn().mockReturnValueOnce(cleanup1).mockReturnValueOnce(cleanup2);
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
    });

    const { unmount } = renderHook(() =>
      useAttachmentLifecycle({
        attachments: [createMockAttachment('1'), createMockAttachment('2')],
        conversationId: 'conv-1',
        attachmentsService,
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
        })
      )
    ).not.toThrow();
  });

  it('handles onAttachmentAdd returning undefined', () => {
    const onAttachmentAdd = jest.fn().mockReturnValue(undefined);
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
    });

    const { rerender, unmount } = renderHook(
      ({ attachments }) =>
        useAttachmentLifecycle({
          attachments,
          conversationId: 'conv-1',
          attachmentsService,
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

  it('extracts data from current version', () => {
    const onAttachmentAdd = jest.fn();
    const attachmentsService = createMockAttachmentsService({
      test_type: { onAttachmentAdd },
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
      })
    );

    expect(onAttachmentAdd).toHaveBeenCalledWith({
      attachment: {
        id: '1',
        type: 'test_type',
        data: { content: 'current' },
        origin: 'some-origin',
        hidden: true,
      },
      conversationId: 'conv-1',
    });
  });
});
