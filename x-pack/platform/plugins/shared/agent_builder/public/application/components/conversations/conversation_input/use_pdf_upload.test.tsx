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
import { uploadPdf, type UploadPdfResult } from './upload_pdf';
import { usePdfUpload } from './use_pdf_upload';

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    pdfFilesClient: { name: 'pdfFilesClient' },
    attachmentsService: { delete: mockDeleteAttachment },
  }),
}));
jest.mock('../../../hooks/use_conversation', () => ({ useAgentId: () => 'agent-1' }));
jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('./upload_pdf', () => ({
  ...jest.requireActual('./upload_pdf'),
  uploadPdf: jest.fn(),
}));

const mockDeleteAttachment = jest.fn();
const mockUploadPdf = jest.mocked(uploadPdf);

const createdAttachment = { id: 'att-1', type: 'pdf', current_version: 1, versions: [] };
const doneResult: UploadPdfResult = {
  status: 'done',
  attachment: createdAttachment as never,
  fileId: 'file-1',
};
const pdfAttachmentInput = {
  id: 'att-1',
  type: 'pdf',
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
  let resolve: (result: UploadPdfResult) => void = () => {};
  mockUploadPdf.mockReturnValueOnce(new Promise((res) => (resolve = res)));
  return { resolve: (result: UploadPdfResult) => act(async () => resolve(result)) };
};

describe('usePdfUpload', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const renderPdfUpload = () =>
    renderHook(
      () =>
        usePdfUpload({
          addErrorToast,
          messageEditorController: messageEditorController as never,
          createConversation,
        }),
      { wrapper }
    );
  const paste = (result: { current: ReturnType<typeof usePdfUpload> }, file = createPdf()) => {
    let name: string | undefined;
    act(() => {
      name = result.current.handlePastePdf?.(file);
    });
    return name;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    setContext({ conversationId: 'conv-1' });
    mockUploadPdf.mockResolvedValue(doneResult);
    mockDeleteAttachment.mockResolvedValue(undefined);
    createConversation.mockResolvedValue({ id: 'new-conv' });
    messageEditorController.getPlaceholderNames.mockReturnValue([]);
  });

  describe('paste in an existing conversation', () => {
    it('returns the name, shows it as loading, then adds the attachment without data', async () => {
      const upload = deferUpload();
      const { result } = renderPdfUpload();

      expect(paste(result)).toBe('invoice.pdf');
      expect(result.current.loadingPdfNames).toEqual(new Set(['invoice.pdf']));
      expect(upsertAttachments).not.toHaveBeenCalled();

      await upload.resolve(doneResult);

      expect(mockUploadPdf).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'invoice.pdf', conversationId: 'conv-1' })
      );
      expect(upsertAttachments).toHaveBeenCalledWith([pdfAttachmentInput]);
      expect(result.current.loadingPdfNames.size).toBe(0);
      expect(createConversation).not.toHaveBeenCalled();
    });

    it('puts the attachment into the conversation cache, for Send', async () => {
      const conversation = { id: 'conv-1', attachments: [{ id: 'other' }] };
      queryClient.setQueryData(queryKeys.conversations.byId('conv-1'), conversation);
      const { result } = renderPdfUpload();

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
      const { result } = renderPdfUpload();

      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(createConversation).toHaveBeenCalledTimes(1);
      expect(createConversation).toHaveBeenCalledWith('agent-1');
      expect(mockUploadPdf).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'new-conv' })
      );
      expect(result.current.pendingConversationId).toBe('new-conv');
    });

    it('reuses the conversation for the next PDF', async () => {
      const { result } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalledTimes(1));
      act(() => result.current.handleRemovePdf('invoice.pdf'));

      paste(result, createPdf('second.pdf'));
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalledTimes(2));

      expect(createConversation).toHaveBeenCalledTimes(1);
    });

    it('removes the chip and reads nothing when the conversation cannot be created', async () => {
      createConversation.mockRejectedValue(new Error('boom'));
      const { result } = renderPdfUpload();

      paste(result);

      await waitFor(() =>
        expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
          'invoice.pdf',
          'pdf'
        )
      );
      expect(mockUploadPdf).not.toHaveBeenCalled();
      expect(result.current.loadingPdfNames.size).toBe(0);
      expect(result.current.pendingConversationId).toBeUndefined();
    });
  });

  describe('checks before the upload', () => {
    it('refuses a file that is not a PDF with a toast', () => {
      const { result } = renderPdfUpload();

      expect(paste(result, new File(['x'], 'a.txt', { type: 'text/plain' }))).toBeUndefined();

      expect(addErrorToast).toHaveBeenCalledWith({ title: 'Only PDF files are supported.' });
      expect(mockUploadPdf).not.toHaveBeenCalled();
    });

    it('refuses a second PDF while the first one is loading', () => {
      deferUpload();
      const { result } = renderPdfUpload();
      paste(result);

      expect(paste(result, createPdf('second.pdf'))).toBeUndefined();

      expect(addErrorToast).toHaveBeenCalledWith({ title: 'You can attach 1 PDF per message.' });
      expect(result.current.loadingPdfNames).toEqual(new Set(['invoice.pdf']));
    });

    it('refuses a second PDF after the first one is added', async () => {
      const { result } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(paste(result, createPdf('second.pdf'))).toBeUndefined();

      expect(addErrorToast).toHaveBeenCalledWith({ title: 'You can attach 1 PDF per message.' });
    });
  });

  it('shows the error and removes the chip when the read fails', async () => {
    mockUploadPdf.mockResolvedValue({ status: 'failed', message: 'The file is not a valid PDF.' });
    const { result } = renderPdfUpload();

    paste(result);

    await waitFor(() =>
      expect(addErrorToast).toHaveBeenCalledWith({ title: 'The file is not a valid PDF.' })
    );
    expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
      'invoice.pdf',
      'pdf'
    );
    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(result.current.loadingPdfNames.size).toBe(0);
  });

  describe('removing a PDF', () => {
    it('while loading aborts the work, removes the chip and ignores the late result', async () => {
      const upload = deferUpload();
      const { result } = renderPdfUpload();
      paste(result);
      const { signal } = mockUploadPdf.mock.calls[0][0];

      act(() => result.current.handleRemovePdf('invoice.pdf'));

      expect(signal.aborted).toBe(true);
      expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
        'invoice.pdf',
        'pdf'
      );
      expect(result.current.loadingPdfNames.size).toBe(0);

      await upload.resolve(doneResult);

      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(mockDeleteAttachment).not.toHaveBeenCalled();
    });

    it('after it was added permanently deletes the attachment and clears every trace', async () => {
      queryClient.setQueryData(queryKeys.conversations.byId('conv-1'), { id: 'conv-1' });
      const { result, rerender } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      setContext({ conversationId: 'conv-1', attachments: [pdfAttachmentInput] });
      rerender();

      act(() => result.current.handleRemovePdf('invoice.pdf'));

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
      const { result } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(() => act(() => result.current.handleRemovePdf('invoice.pdf'))).not.toThrow();
    });
  });

  describe('handleAfterInput', () => {
    it('removes a PDF whose chip was deleted from the text', async () => {
      const { result } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      messageEditorController.getPlaceholderNames.mockReturnValue([]);

      act(() => result.current.handleAfterInput());

      expect(messageEditorController.getPlaceholderNames).toHaveBeenCalledWith('pdf');
      expect(mockDeleteAttachment).toHaveBeenCalledTimes(1);
    });

    it('keeps a PDF whose chip is still in the text', async () => {
      const { result } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      messageEditorController.getPlaceholderNames.mockReturnValue(['invoice.pdf']);

      act(() => result.current.handleAfterInput());

      expect(mockDeleteAttachment).not.toHaveBeenCalled();
    });

    it('cancels a PDF that is loading when its chip was deleted', () => {
      deferUpload();
      const { result } = renderPdfUpload();
      paste(result);
      const { signal } = mockUploadPdf.mock.calls[0][0];

      act(() => result.current.handleAfterInput());

      expect(signal.aborted).toBe(true);
      expect(result.current.loadingPdfNames.size).toBe(0);
    });
  });

  describe('leaving', () => {
    it('aborts the work in flight when the conversation changes', () => {
      deferUpload();
      const { result, rerender } = renderPdfUpload();
      paste(result);
      const { signal } = mockUploadPdf.mock.calls[0][0];

      setContext({ conversationId: 'conv-2' });
      rerender();

      expect(signal.aborted).toBe(true);
      expect(result.current.loadingPdfNames.size).toBe(0);
    });

    it('deletes the PDFs that were not sent when the conversation changes', async () => {
      const { result, rerender } = renderPdfUpload();
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
      const { result, rerender } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(result.current.pendingConversationId).toBe('new-conv'));

      setContext({ conversationId: 'new-conv' });
      rerender();

      expect(result.current.pendingConversationId).toBeUndefined();
    });

    it('keeps the PDFs that were sent, even when the screen changes right after', async () => {
      setContext({ conversationId: undefined });
      const { result, rerender } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      act(() => result.current.handleSubmitted());
      setContext({ conversationId: 'new-conv' });
      rerender();

      expect(mockDeleteAttachment).not.toHaveBeenCalled();
      expect(result.current.pendingConversationId).toBeUndefined();
    });

    it('deletes the PDFs that were not sent when the input unmounts', async () => {
      const { result, unmount } = renderPdfUpload();
      paste(result);
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      unmount();

      expect(mockDeleteAttachment).toHaveBeenCalledTimes(1);
    });
  });
});
