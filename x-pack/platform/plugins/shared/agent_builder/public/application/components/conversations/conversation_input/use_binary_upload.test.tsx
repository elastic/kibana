/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { uploadBinary, type UploadBinaryResult } from './upload_binary';
import { useBinaryUpload } from './use_binary_upload';

const mockBinaryFilesClient = { name: 'binaryFilesClient' };
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({ binaryFilesClient: mockBinaryFilesClient }),
}));
jest.mock('../../../hooks/use_conversation', () => ({ useAgentId: () => 'agent-1' }));
jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('./upload_binary', () => ({
  ...jest.requireActual('./upload_binary'),
  uploadBinary: jest.fn(),
}));

const mockUploadBinary = jest.mocked(uploadBinary);

const doneResult: UploadBinaryResult = { status: 'done', fileId: 'file-1' };
const binaryAttachmentInput = { type: 'binary', origin: 'file-1', description: 'invoice.pdf' };

const upsertAttachments = jest.fn();
const removeAttachments = jest.fn();
const addErrorToast = jest.fn();
const messageEditorController = {
  getPlaceholderNames: jest.fn(),
  removePlaceholderByName: jest.fn(),
};

const setContext = ({
  conversationId,
  attachments = [],
}: {
  conversationId?: string;
  attachments?: unknown[];
}) =>
  jest.mocked(useConversationContext).mockReturnValue({
    conversationId,
    attachments,
    upsertAttachments,
    removeAttachments,
  } as never);

const createPdf = (name = 'invoice.pdf') =>
  new File([new Uint8Array(4)], name, { type: 'application/pdf' });

/** An upload the test finishes by hand, so it can check the state in between. */
const deferUpload = () => {
  let resolve: (result: UploadBinaryResult) => void = () => {};
  mockUploadBinary.mockReturnValueOnce(new Promise((res) => (resolve = res)));
  return { resolve: (result: UploadBinaryResult) => act(async () => resolve(result)) };
};

const signalOfCall = (index: number): AbortSignal => mockUploadBinary.mock.calls[index][0].signal;

describe('useBinaryUpload', () => {
  const renderBinaryUpload = () =>
    renderHook(() =>
      useBinaryUpload({
        addErrorToast,
        messageEditorController: messageEditorController as never,
      })
    );
  const paste = (
    result: { current: ReturnType<typeof useBinaryUpload> },
    file = createPdf()
  ): string => {
    act(() => {
      result.current.handlePasteBinary?.(file, file.name, 'application/pdf');
    });
    return file.name;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setContext({ conversationId: 'conv-1' });
    mockUploadBinary.mockResolvedValue(doneResult);
    messageEditorController.getPlaceholderNames.mockReturnValue([]);
  });

  it.each([
    ['an existing conversation', 'conv-1'],
    ['a new chat', undefined],
  ])(
    'in %s, shows the PDF as loading, then adds an attachment with only the file id',
    async (_, conversationId) => {
      setContext({ conversationId });
      const upload = deferUpload();
      const { result } = renderBinaryUpload();

      paste(result);
      expect(result.current.loadingBinaryNames).toEqual(new Set(['invoice.pdf']));
      expect(mockUploadBinary).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'invoice.pdf',
          mimeType: 'application/pdf',
          binaryFilesClient: mockBinaryFilesClient,
        })
      );

      await upload.resolve(doneResult);

      expect(result.current.loadingBinaryNames.size).toBe(0);
      expect(upsertAttachments).toHaveBeenCalledWith([binaryAttachmentInput]);
    }
  );

  it('shows the error and removes the chip when the upload fails', async () => {
    mockUploadBinary.mockResolvedValue({ status: 'failed', message: 'Could not upload the file.' });
    const { result } = renderBinaryUpload();

    paste(result);
    await act(async () => {});

    expect(addErrorToast).toHaveBeenCalledWith({
      title: 'Could not upload the file.',
      text: 'invoice.pdf',
    });
    expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
      'invoice.pdf',
      'binary'
    );
    expect(result.current.loadingBinaryNames.size).toBe(0);
    expect(upsertAttachments).not.toHaveBeenCalled();
  });

  describe('removing a PDF', () => {
    it('while uploading aborts the upload, removes the chip and ignores the late result', async () => {
      const upload = deferUpload();
      const { result } = renderBinaryUpload();
      const name = paste(result);

      act(() => result.current.handleRemoveBinary(name));

      expect(signalOfCall(0).aborted).toBe(true);
      expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(name, 'binary');
      expect(result.current.loadingBinaryNames.size).toBe(0);

      await upload.resolve(doneResult);
      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(addErrorToast).not.toHaveBeenCalled();
    });

    it('after the upload removes its attachment', async () => {
      const { result, rerender } = renderBinaryUpload();
      const name = paste(result);
      await act(async () => {});
      setContext({ conversationId: 'conv-1', attachments: [binaryAttachmentInput] });
      rerender();

      act(() => result.current.handleRemoveBinary(name));

      expect(removeAttachments).toHaveBeenCalledWith([binaryAttachmentInput]);
    });

    it('ignores the late result of an old upload when the name was reused', async () => {
      const firstUpload = deferUpload();
      const { result } = renderBinaryUpload();
      const name = paste(result);
      act(() => result.current.handleRemoveBinary(name));
      const secondUpload = deferUpload();
      paste(result);

      await firstUpload.resolve({ status: 'done', fileId: 'old-file' });
      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(result.current.loadingBinaryNames).toEqual(new Set([name]));

      await secondUpload.resolve(doneResult);
      expect(upsertAttachments).toHaveBeenCalledTimes(1);
      expect(upsertAttachments).toHaveBeenCalledWith([binaryAttachmentInput]);
    });
  });

  describe('handleAfterInput', () => {
    it('removes the attachment of a PDF whose chip was deleted from the text', async () => {
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await act(async () => {});
      setContext({ conversationId: 'conv-1', attachments: [binaryAttachmentInput] });
      rerender();

      act(() => result.current.handleAfterInput());

      expect(removeAttachments).toHaveBeenCalledWith([binaryAttachmentInput]);
    });

    it('keeps a PDF whose chip is still in the text', async () => {
      messageEditorController.getPlaceholderNames.mockReturnValue(['invoice.pdf']);
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await act(async () => {});
      setContext({ conversationId: 'conv-1', attachments: [binaryAttachmentInput] });
      rerender();

      act(() => result.current.handleAfterInput());

      expect(removeAttachments).not.toHaveBeenCalled();
    });

    it('keeps a PDF with the same name that another feature added', async () => {
      const hostAttachment = { type: 'binary', origin: 'host-file', description: 'invoice.pdf' };
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await act(async () => {});
      setContext({
        conversationId: 'conv-1',
        attachments: [hostAttachment, binaryAttachmentInput],
      });
      rerender();

      act(() => result.current.handleAfterInput());

      expect(removeAttachments).toHaveBeenCalledWith([binaryAttachmentInput]);
    });

    it('keeps a binary attachment that another feature added', () => {
      const hostAttachment = { type: 'binary', origin: 'host-file', description: 'report.pdf' };
      setContext({ conversationId: 'conv-1', attachments: [hostAttachment] });
      const { result } = renderBinaryUpload();

      act(() => result.current.handleAfterInput());

      expect(removeAttachments).not.toHaveBeenCalled();
    });

    it('cancels an upload whose chip was deleted', () => {
      deferUpload();
      const { result } = renderBinaryUpload();
      paste(result);

      act(() => result.current.handleAfterInput());

      expect(signalOfCall(0).aborted).toBe(true);
      expect(result.current.loadingBinaryNames.size).toBe(0);
    });
  });

  describe('leaving', () => {
    it('aborts the uploads in flight when the conversation changes', async () => {
      const upload = deferUpload();
      const { result, rerender } = renderBinaryUpload();
      paste(result);

      setContext({ conversationId: 'conv-2' });
      rerender();

      expect(signalOfCall(0).aborted).toBe(true);
      expect(result.current.loadingBinaryNames.size).toBe(0);
      // The upload finished on the server before the abort arrived.
      await upload.resolve(doneResult);
      expect(upsertAttachments).not.toHaveBeenCalled();
    });

    it('forgets the PDFs it added, so the next conversation keeps its attachments', async () => {
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await act(async () => {});

      setContext({ conversationId: 'conv-2', attachments: [binaryAttachmentInput] });
      rerender();
      act(() => result.current.handleAfterInput());

      expect(removeAttachments).not.toHaveBeenCalled();
    });

    it('aborts the uploads in flight when the input unmounts', () => {
      deferUpload();
      const { result, unmount } = renderBinaryUpload();
      paste(result);

      unmount();

      expect(signalOfCall(0).aborted).toBe(true);
    });
  });
});
