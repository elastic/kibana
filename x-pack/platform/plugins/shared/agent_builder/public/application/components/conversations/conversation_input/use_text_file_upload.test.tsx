/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { readTextFile } from './read_text_file';
import { useTextFileUpload } from './use_text_file_upload';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('./read_text_file', () => ({ readTextFile: jest.fn() }));
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => {
    throw new Error('A text file must not use the Agent Builder services');
  },
}));

const mockReadTextFile = jest.mocked(readTextFile);

const upsertAttachments = jest.fn();
const removeAttachment = jest.fn();
const addErrorToast = jest.fn();
const messageEditorController = {
  getPlaceholderNames: jest.fn(),
  removePlaceholderByName: jest.fn(),
};

const setContext = ({
  conversationId = 'conv-1',
  attachments = [],
}: {
  conversationId?: string;
  attachments?: unknown[];
} = {}) =>
  jest.mocked(useConversationContext).mockReturnValue({
    conversationId,
    attachments,
    upsertAttachments,
    removeAttachment,
  } as never);

const createFile = (name = 'notes.md') => new File(['# Hi'], name, { type: '' });

const renderTextFileUpload = () =>
  renderHook(() =>
    useTextFileUpload({
      addErrorToast,
      messageEditorController: messageEditorController as never,
    })
  );

describe('useTextFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setContext();
    mockReadTextFile.mockResolvedValue({ status: 'done', content: '# Hi' });
    messageEditorController.getPlaceholderNames.mockReturnValue([]);
  });

  describe('paste', () => {
    it('shows the file as loading, then adds a text attachment with the content and the name', async () => {
      let finishRead: (result: { status: 'done'; content: string }) => void = () => {};
      mockReadTextFile.mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
      const { result } = renderTextFileUpload();

      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));

      expect(result.current.loadingTextFileNames).toEqual(new Set(['notes.md']));
      expect(upsertAttachments).not.toHaveBeenCalled();

      await act(async () => finishRead({ status: 'done', content: '# Hi' }));

      expect(upsertAttachments).toHaveBeenCalledWith([
        { type: 'text', data: { content: '# Hi', name: 'notes.md' } },
      ]);
      expect(result.current.loadingTextFileNames.size).toBe(0);
    });

    it('adds an empty file with empty content', async () => {
      mockReadTextFile.mockResolvedValue({ status: 'done', content: '' });
      const { result } = renderTextFileUpload();

      act(() => result.current.handlePasteTextFile?.(createFile('empty.txt'), 'empty.txt'));
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());

      expect(upsertAttachments).toHaveBeenCalledWith([
        { type: 'text', data: { content: '', name: 'empty.txt' } },
      ]);
    });

    it('shows the error and removes the chip when the file cannot be read', async () => {
      mockReadTextFile.mockResolvedValue({
        status: 'failed',
        message: 'The file must be UTF-8 text.',
      });
      const { result } = renderTextFileUpload();

      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));

      await waitFor(() =>
        expect(addErrorToast).toHaveBeenCalledWith({
          title: 'The file must be UTF-8 text.',
          text: 'notes.md',
        })
      );
      expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
        'notes.md',
        'text'
      );
      expect(upsertAttachments).not.toHaveBeenCalled();
      expect(result.current.loadingTextFileNames.size).toBe(0);
    });

    it('has no paste handler when attachments cannot be added', () => {
      jest.mocked(useConversationContext).mockReturnValue({ conversationId: 'conv-1' } as never);

      const { result } = renderTextFileUpload();

      expect(result.current.handlePasteTextFile).toBeUndefined();
    });
  });

  describe('removing a text file', () => {
    it('removes the chip and the attachment', async () => {
      const { result, rerender } = renderTextFileUpload();
      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      setContext({
        attachments: [{ type: 'text', data: { content: '# Hi', name: 'notes.md' } }],
      });
      rerender();

      act(() => result.current.handleRemoveTextFile('notes.md'));

      expect(messageEditorController.removePlaceholderByName).toHaveBeenCalledWith(
        'notes.md',
        'text'
      );
      expect(removeAttachment).toHaveBeenCalledWith(0);
    });

    it('while reading drops the late result', async () => {
      let finishRead: (result: { status: 'done'; content: string }) => void = () => {};
      mockReadTextFile.mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
      const { result } = renderTextFileUpload();
      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));

      act(() => result.current.handleRemoveTextFile('notes.md'));
      await act(async () => finishRead({ status: 'done', content: '# Hi' }));

      expect(result.current.loadingTextFileNames.size).toBe(0);
      expect(upsertAttachments).not.toHaveBeenCalled();
    });
  });

  describe('handleAfterInput', () => {
    it('removes the attachment of a chip that was deleted from the text', async () => {
      const { result, rerender } = renderTextFileUpload();
      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      setContext({
        attachments: [{ type: 'text', data: { content: '# Hi', name: 'notes.md' } }],
      });
      rerender();
      messageEditorController.getPlaceholderNames.mockReturnValue([]);

      act(() => result.current.handleAfterInput());

      expect(messageEditorController.getPlaceholderNames).toHaveBeenCalledWith('text');
      expect(removeAttachment).toHaveBeenCalledWith(0);
    });

    it('keeps the attachment of a chip that is still in the text', async () => {
      const { result, rerender } = renderTextFileUpload();
      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));
      await waitFor(() => expect(upsertAttachments).toHaveBeenCalled());
      setContext({
        attachments: [{ type: 'text', data: { content: '# Hi', name: 'notes.md' } }],
      });
      rerender();
      messageEditorController.getPlaceholderNames.mockReturnValue(['notes.md']);

      act(() => result.current.handleAfterInput());

      expect(removeAttachment).not.toHaveBeenCalled();
    });

    it('keeps a named text attachment that did not come from a paste', () => {
      setContext({
        attachments: [{ type: 'text', data: { content: 'x', name: 'from-other-feature.txt' } }],
      });
      const { result } = renderTextFileUpload();

      act(() => result.current.handleAfterInput());

      expect(removeAttachment).not.toHaveBeenCalled();
    });

    it('cancels a read when its chip was deleted', () => {
      mockReadTextFile.mockReturnValueOnce(new Promise(() => {}));
      const { result } = renderTextFileUpload();
      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));

      act(() => result.current.handleAfterInput());

      expect(result.current.loadingTextFileNames.size).toBe(0);
    });
  });

  describe('leaving', () => {
    it('forgets the reads in flight when the conversation changes', async () => {
      let finishRead: (result: { status: 'done'; content: string }) => void = () => {};
      mockReadTextFile.mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));
      const { result, rerender } = renderTextFileUpload();
      act(() => result.current.handlePasteTextFile?.(createFile(), 'notes.md'));

      setContext({ conversationId: 'conv-2' });
      rerender();
      await act(async () => finishRead({ status: 'done', content: '# Hi' }));

      expect(result.current.loadingTextFileNames.size).toBe(0);
      expect(upsertAttachments).not.toHaveBeenCalled();
    });
  });
});
