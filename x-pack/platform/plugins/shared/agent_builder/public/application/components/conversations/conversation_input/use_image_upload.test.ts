/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { useImageUpload } from './use_image_upload';
import { processImageFile } from './upload_image';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../hooks/use_kibana';
import { useConversationContext } from '../../../context/conversation/conversation_context';

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('./upload_image', () => ({
  ...jest.requireActual('./upload_image'),
  processImageFile: jest.fn(),
}));

interface PendingUpload {
  name: string;
  abortSignal?: AbortSignal;
  finish: () => void;
}

const createImageAttachment = (name: string): ConversationAttachment => ({
  type: AttachmentType.image,
  data: { file_id: `file-${name}`, name, mime_type: 'image/png' },
});

const getImageName = (attachment: ConversationAttachment): string | undefined =>
  'items' in attachment ? undefined : (attachment.data as { name?: string }).name;

describe('useImageUpload', () => {
  let conversation: { id?: string; attachments: ConversationAttachment[] };
  let editorChipNames: string[];
  let pendingUploads: PendingUpload[];
  let controller: MessageEditorController;

  const upsertAttachments = jest.fn((incoming: ConversationAttachment[]) => {
    for (const attachment of incoming) {
      const index = conversation.attachments.findIndex(
        (a) => getImageName(a) === getImageName(attachment)
      );
      conversation.attachments =
        index === -1
          ? [...conversation.attachments, attachment]
          : conversation.attachments.map((a, i) => (i === index ? attachment : a));
    }
  });
  const removeAttachment = jest.fn((index: number) => {
    conversation.attachments = conversation.attachments.filter((_, i) => i !== index);
  });
  const addErrorToast = jest.fn();

  const setup = () => {
    const rendered = renderHook(() =>
      useImageUpload({ addErrorToast, messageEditorController: controller })
    );

    const rerender = () => rendered.rerender();
    const attachedNames = () =>
      conversation.attachments.map(getImageName).filter((n): n is string => Boolean(n));

    const paste = (fileName: string): string => {
      let name: string | undefined;
      act(() => {
        name = rendered.result.current.handlePasteFile?.(
          new File([new Uint8Array(4)], fileName, { type: 'image/png' })
        );
      });
      if (!name) throw new Error('paste was rejected');
      editorChipNames.push(name);
      return name;
    };

    const finishUpload = async (name: string) => {
      const upload = pendingUploads.find((u) => u.name === name);
      if (!upload) throw new Error(`no pending upload for ${name}`);
      pendingUploads = pendingUploads.filter((u) => u !== upload);
      await act(async () => {
        upload.finish();
      });
      rerender();
    };

    const afterInput = () => {
      act(() => {
        rendered.result.current.handleAfterInput();
      });
      rerender();
    };

    const removeChip = (name: string) => {
      editorChipNames = editorChipNames.filter((n) => n !== name);
      afterInput();
    };

    const restoreChip = (name: string) => {
      editorChipNames.push(name);
      afterInput();
    };

    return { ...rendered, rerender, attachedNames, paste, finishUpload, removeChip, restoreChip };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    conversation = { id: 'conversation-1', attachments: [] };
    editorChipNames = [];
    pendingUploads = [];

    controller = {
      focus: jest.fn(),
      clear: jest.fn(),
      getContent: jest.fn(() => ''),
      setContent: jest.fn(),
      isEmpty: false,
      getPlaceholderNames: jest.fn(() => [...editorChipNames]),
      removePlaceholderByName: jest.fn((name: string) => {
        editorChipNames = editorChipNames.filter((n) => n !== name);
      }),
    };

    jest
      .mocked(useAgentBuilderServices)
      .mockReturnValue({ filesClient: {} } as ReturnType<typeof useAgentBuilderServices>);
    jest.mocked(useKibana).mockReturnValue({
      services: { analytics: { reportEvent: jest.fn() } },
    } as unknown as ReturnType<typeof useKibana>);
    jest.mocked(useConversationContext).mockImplementation(
      () =>
        ({
          conversationId: conversation.id,
          attachments: conversation.attachments,
          upsertAttachments,
          removeAttachment,
        } as unknown as ReturnType<typeof useConversationContext>)
    );
    jest.mocked(processImageFile).mockImplementation(
      ({ name, upsertAttachments: onUploaded, abortSignal }) =>
        new Promise<boolean>((resolve) => {
          pendingUploads.push({
            name,
            abortSignal,
            finish: () => {
              onUploaded([createImageAttachment(name)]);
              resolve(true);
            },
          });
        })
    );
  });

  describe('undo and redo of a finished upload', () => {
    it('removes the attachment when its chip leaves and upserts the same one when the chip comes back', async () => {
      const { paste, finishUpload, removeChip, restoreChip, attachedNames } = setup();
      const name = paste('img.png');
      await finishUpload(name);
      const [original] = conversation.attachments;
      expect(attachedNames()).toEqual(['img.png']);

      removeChip(name);
      expect(attachedNames()).toEqual([]);

      restoreChip(name);
      expect(attachedNames()).toEqual(['img.png']);
      expect(conversation.attachments[0]).toBe(original);
    });

    it('keeps working over repeated remove and restore cycles', async () => {
      const { paste, finishUpload, removeChip, restoreChip, attachedNames } = setup();
      const name = paste('img.png');
      await finishUpload(name);
      const [original] = conversation.attachments;

      for (let i = 0; i < 3; i++) {
        removeChip(name);
        expect(attachedNames()).toEqual([]);
        restoreChip(name);
        expect(attachedNames()).toEqual(['img.png']);
        expect(conversation.attachments[0]).toBe(original);
      }
      expect(conversation.attachments).toHaveLength(1);
    });

    it('does not upsert anything when an input leaves the chip in place', async () => {
      const { paste, finishUpload, restoreChip } = setup();
      const name = paste('img.png');
      await finishUpload(name);
      upsertAttachments.mockClear();

      restoreChip(name);

      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(removeAttachment).not.toHaveBeenCalled();
    });
  });

  describe('chip removed while the upload is running', () => {
    it('does not abort the upload and hides the name from uploadingNames', () => {
      const { result, paste, removeChip } = setup();
      const name = paste('img.png');
      expect(result.current.uploadingNames.has(name)).toBe(true);

      removeChip(name);

      expect(pendingUploads[0].abortSignal?.aborted).toBe(false);
      expect(result.current.uploadingNames.has(name)).toBe(false);
    });

    it('keeps the finished attachment aside until the chip comes back', async () => {
      const { result, paste, finishUpload, removeChip, restoreChip, attachedNames } = setup();
      const name = paste('img.png');
      removeChip(name);

      await finishUpload(name);

      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(attachedNames()).toEqual([]);
      expect(result.current.uploadingNames.size).toBe(0);

      restoreChip(name);

      expect(attachedNames()).toEqual(['img.png']);
    });

    it('puts the name back in uploadingNames when the chip returns while still uploading', async () => {
      const { result, paste, finishUpload, removeChip, restoreChip, attachedNames } = setup();
      const name = paste('img.png');
      removeChip(name);
      expect(result.current.uploadingNames.has(name)).toBe(false);

      restoreChip(name);
      expect(result.current.uploadingNames.has(name)).toBe(true);
      expect(attachedNames()).toEqual([]);

      await finishUpload(name);

      expect(result.current.uploadingNames.size).toBe(0);
      expect(attachedNames()).toEqual(['img.png']);
    });
  });

  describe('name reservation', () => {
    it('gives a new paste a unique name while a finished attachment is detached', async () => {
      const { paste, finishUpload, removeChip } = setup();
      const first = paste('img.png');
      await finishUpload(first);
      removeChip(first);

      expect(paste('img.png')).toBe('img 2.png');
    });

    it('gives a new paste a unique name while a hidden upload is still running', () => {
      const { paste, removeChip } = setup();
      const first = paste('img.png');
      removeChip(first);

      expect(paste('img.png')).toBe('img 2.png');
    });

    it('keeps both attachments when the old chip comes back after a same-name paste', async () => {
      const { paste, finishUpload, removeChip, restoreChip, attachedNames } = setup();
      const first = paste('img.png');
      await finishUpload(first);
      removeChip(first);
      const second = paste('img.png');
      await finishUpload(second);

      restoreChip(first);

      expect(attachedNames()).toEqual(['img 2.png', 'img.png']);
    });
  });

  describe('handleRemoveAttachment', () => {
    it('removes the chip and the attachment of a finished upload', async () => {
      const { result, paste, finishUpload, attachedNames } = setup();
      const name = paste('img.png');
      await finishUpload(name);
      const [attachment] = conversation.attachments;

      act(() => {
        result.current.handleRemoveAttachment?.(attachment);
      });

      expect(controller.removePlaceholderByName).toHaveBeenCalledWith(name);
      expect(removeAttachment).toHaveBeenCalledWith(0);
      expect(attachedNames()).toEqual([]);
    });

    it('aborts a running upload', () => {
      const { result, paste } = setup();
      const name = paste('img.png');

      act(() => {
        result.current.handleRemoveAttachment?.(createImageAttachment(name));
      });

      expect(pendingUploads[0].abortSignal?.aborted).toBe(true);
      expect(result.current.uploadingNames.has(name)).toBe(false);
    });
  });

  it('forgets detached attachments when the conversation changes', async () => {
    const { paste, finishUpload, removeChip, restoreChip, rerender, attachedNames } = setup();
    const name = paste('img.png');
    await finishUpload(name);
    removeChip(name);

    conversation = { id: 'conversation-2', attachments: [] };
    rerender();
    restoreChip(name);

    expect(attachedNames()).toEqual([]);
  });
});
