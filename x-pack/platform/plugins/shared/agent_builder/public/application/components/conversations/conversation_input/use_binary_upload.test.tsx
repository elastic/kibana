/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { queryKeys } from '../../../query_keys';
import { uploadBinary, type UploadBinaryResult } from './upload_binary';
import { useBinaryUpload } from './use_binary_upload';

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    binaryFilesClient: { name: 'binaryFilesClient' },
    attachmentsService: { delete: mockDeleteAttachment },
  }),
}));
jest.mock('../../../hooks/use_conversation', () => ({ useAgentId: () => 'agent-1' }));
jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('./upload_binary', () => ({
  ...jest.requireActual('./upload_binary'),
  uploadBinary: jest.fn(),
}));

const mockDeleteAttachment = jest.fn();
const mockUploadBinary = jest.mocked(uploadBinary);

const createdAttachment = { id: 'att-1', type: 'binary', current_version: 1, versions: [] };
const doneResult: UploadBinaryResult = {
  status: 'done',
  attachment: createdAttachment as never,
  fileId: 'file-1',
};
const binaryAttachmentInput = {
  id: 'att-1',
  type: 'binary',
  origin: 'file-1',
  description: 'invoice.pdf',
};

const upsertAttachments = jest.fn();
const removeAttachment = jest.fn();
const addErrorToast = jest.fn();
const createConversation = jest.fn();
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
    removeAttachment,
  } as never);

const createPdf = (name = 'invoice.pdf') =>
  new File([new Uint8Array(4)], name, { type: 'application/pdf' });

/** A read the test finishes by hand, so it can check the state in between. */
const deferUpload = () => {
  let resolve: (result: UploadBinaryResult) => void = () => {};
  mockUploadBinary.mockReturnValueOnce(new Promise((res) => (resolve = res)));
  return { resolve: (result: UploadBinaryResult) => act(async () => resolve(result)) };
};

describe('useBinaryUpload', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const renderBinaryUpload = () =>
    renderHook(
      () =>
        useBinaryUpload({
          addErrorToast,
          messageEditorController: messageEditorController as never,
          createConversation,
        }),
      { wrapper }
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
    queryClient = new QueryClient();
    setContext({ conversationId: 'conv-1' });
    mockUploadBinary.mockResolvedValue(doneResult);
    mockDeleteAttachment.mockResolvedValue(undefined);
    createConversation.mockResolvedValue({ id: 'new-conv' });
    messageEditorController.getPlaceholderNames.mockReturnValue([]);
  });

  describe('paste in an existing conversation', () => {
    it('returns the name, shows it as loading, then adds the attachment without data', async () => {
      const upload = deferUpload();
      const { result } = renderBinaryUpload();

      expect(paste(result)).toBe('invoice.pdf');
      expect(result.current.loadingBinaryNames).toEqual(new Set(['invoice.pdf']));
      expect(upsertAttachments).not.toHaveBeenCalled();

      await upload.resolve(doneResult);

      expect(mockUploadBinary).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'invoice.pdf',
          mimeType: 'application/pdf',
          conversationId: 'conv-1',
        })
      );
      expect(upsertAttachments).toHaveBeenCalledWith([binaryAttachmentInput]);
      expect(result.current.loadingBinaryNames.size).toBe(0);
      expect(createConversation).not.toHaveBeenCalled();
    });

    it('puts the attachment into the conversation cache, for Send', async () => {
      const conversation = { id: 'conv-1', attachments: [{ id: 'other' }] };
      queryClient.setQueryData(queryKeys.conversations.byId('conv-1'), conversation);
      const { result } = renderBinaryUpload();

      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(queryClient.getQueryData(queryKeys.conversations.byId('conv-1'))).toEqual({
        id: 'conv-1',
        attachments: [{ id: 'other' }, createdAttachment],
      });
    });
  });

  describe('paste in a new chat', () => {
    beforeEach(() => setContext({ conversationId: undefined }));

    it('creates the conversation once and reads the PDF into it', async () => {
      const { result } = renderBinaryUpload();

      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(createConversation).toHaveBeenCalledTimes(1);
      expect(createConversation).toHaveBeenCalledWith('agent-1');
      expect(mockUploadBinary).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'new-conv' })
      );
      expect(result.current.pendingConversationId).toBe('new-conv');
    });

    it('creates the conversation once when two PDFs are pasted at the same time', async () => {
      const { result } = renderBinaryUpload();

      act(() => {
        result.current.handlePasteBinary?.(createPdf('first.pdf'), 'first.pdf', 'application/pdf');
        result.current.handlePasteBinary?.(
          createPdf('second.pdf'),
          'second.pdf',
          'application/pdf'
        );
      });
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalledTimes(2));

      expect(createConversation).toHaveBeenCalledTimes(1);
      expect(mockUploadBinary).toHaveBeenCalledTimes(2);
      expect(mockUploadBinary).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'first.pdf', conversationId: 'new-conv' })
      );
      expect(mockUploadBinary).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'second.pdf', conversationId: 'new-conv' })
      );
    });

    it('reuses the conversation for the next PDF', async () => {
      const { result } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalledTimes(1));
      act(() => result.current.handleRemoveBinary('invoice.pdf'));

      paste(result, createPdf('second.pdf'));
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalledTimes(2));

      expect(createConversation).toHaveBeenCalledTimes(1);
    });

    it('removes the chip and reads nothing when the conversation cannot be created', async () => {
      createConversation.mockRejectedValue(new Error('boom'));
      const { result } = renderBinaryUpload();

      paste(result);

      await waitFor(() =>
        expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
          'invoice.pdf',
          'binary'
        )
      );
      expect(mockUploadBinary).not.toHaveBeenCalled();
      expect(result.current.loadingBinaryNames.size).toBe(0);
      expect(result.current.pendingConversationId).toBeUndefined();
    });
  });

  it('shows the error and removes the chip when the read fails', async () => {
    mockUploadBinary.mockResolvedValue({
      status: 'failed',
      message: 'The file is not a valid PDF.',
    });
    const { result } = renderBinaryUpload();

    paste(result);

    await waitFor(() =>
      expect(addErrorToast).toHaveBeenCalledWith({
        title: 'The file is not a valid PDF.',
        text: 'invoice.pdf',
      })
    );
    expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
      'invoice.pdf',
      'binary'
    );
    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(result.current.loadingBinaryNames.size).toBe(0);
  });

  describe('removing a PDF', () => {
    it('while loading aborts the work, removes the chip and ignores the late result', async () => {
      const upload = deferUpload();
      const { result } = renderBinaryUpload();
      paste(result);
      const { signal } = mockUploadBinary.mock.calls[0][0];

      act(() => result.current.handleRemoveBinary('invoice.pdf'));

      expect(signal.aborted).toBe(true);
      expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
        'invoice.pdf',
        'binary'
      );
      expect(result.current.loadingBinaryNames.size).toBe(0);

      await upload.resolve(doneResult);

      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(mockDeleteAttachment).not.toHaveBeenCalled();
    });

    it('after it was added permanently deletes the attachment and clears every trace', async () => {
      queryClient.setQueryData(queryKeys.conversations.byId('conv-1'), { id: 'conv-1' });
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      setContext({ conversationId: 'conv-1', attachments: [binaryAttachmentInput] });
      rerender();

      act(() => result.current.handleRemoveBinary('invoice.pdf'));

      expect(mockDeleteAttachment).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        attachmentId: 'att-1',
        permanent: true,
      });
      expect(removeAttachment).toHaveBeenCalledWith(0);
      expect(
        queryClient.getQueryData<{ attachments?: unknown[] }>(
          queryKeys.conversations.byId('conv-1')
        )?.attachments
      ).toEqual([]);
    });

    it('does not fail when the delete request fails', async () => {
      mockDeleteAttachment.mockRejectedValue(new Error('boom'));
      const { result } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(() => act(() => result.current.handleRemoveBinary('invoice.pdf'))).not.toThrow();
    });
  });

  describe('handleAfterInput', () => {
    it('removes a PDF whose chip was deleted from the text', async () => {
      const { result } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      messageEditorController.getPlaceholderNames.mockReturnValue([]);

      act(() => result.current.handleAfterInput());

      expect(messageEditorController.getPlaceholderNames).toHaveBeenCalledWith('binary');
      expect(mockDeleteAttachment).toHaveBeenCalledTimes(1);
    });

    it('keeps a PDF whose chip is still in the text', async () => {
      const { result } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      messageEditorController.getPlaceholderNames.mockReturnValue(['invoice.pdf']);

      act(() => result.current.handleAfterInput());

      expect(mockDeleteAttachment).not.toHaveBeenCalled();
    });

    it('cancels a PDF that is loading when its chip was deleted', () => {
      deferUpload();
      const { result } = renderBinaryUpload();
      paste(result);
      const { signal } = mockUploadBinary.mock.calls[0][0];

      act(() => result.current.handleAfterInput());

      expect(signal.aborted).toBe(true);
      expect(result.current.loadingBinaryNames.size).toBe(0);
    });
  });

  describe('leaving', () => {
    it('aborts the work in flight when the conversation changes', () => {
      deferUpload();
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      const { signal } = mockUploadBinary.mock.calls[0][0];

      setContext({ conversationId: 'conv-2' });
      rerender();

      expect(signal.aborted).toBe(true);
      expect(result.current.loadingBinaryNames.size).toBe(0);
    });

    it('deletes the PDFs that were not sent when the conversation changes', async () => {
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      setContext({ conversationId: 'conv-2' });
      rerender();

      expect(mockDeleteAttachment).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        attachmentId: 'att-1',
        permanent: true,
      });
    });

    it('forgets the pending conversation when the conversation changes', async () => {
      setContext({ conversationId: undefined });
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(result.current.pendingConversationId).toBe('new-conv'));

      setContext({ conversationId: 'new-conv' });
      rerender();

      expect(result.current.pendingConversationId).toBeUndefined();
    });

    it('keeps the PDFs that were sent, even when the screen changes right after', async () => {
      setContext({ conversationId: undefined });
      const { result, rerender } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      act(() => result.current.handleSubmitted());
      setContext({ conversationId: 'new-conv' });
      rerender();

      expect(mockDeleteAttachment).not.toHaveBeenCalled();
      expect(result.current.pendingConversationId).toBeUndefined();
    });

    it('deletes the PDFs that were not sent when the input unmounts', async () => {
      const { result, unmount } = renderBinaryUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      unmount();

      expect(mockDeleteAttachment).toHaveBeenCalledTimes(1);
    });
  });
});
