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
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { FakeConversationProvider } from '../../../__storybook__/fake_conversation_provider';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import type { PlaceholderKind } from './message_editor/attachment_placeholder';
import { readTextFile } from './read_text_file';
import { uploadBinary } from './upload_binary';
import { processImageFile } from './upload_image';
import { useAttachmentUploads } from './use_attachment_uploads';

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    filesClient: {},
    binaryFilesClient: {},
    attachmentsService: { delete: jest.fn().mockResolvedValue(undefined) },
  }),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { analytics: { reportEvent: jest.fn() } } }),
}));
jest.mock('../../../hooks/use_conversation', () => ({ useAgentId: () => 'agent-1' }));
jest.mock('../../../hooks/use_supported_binary_types', () => ({
  useSupportedBinaryTypes: () => ['application/pdf'],
}));
jest.mock('./read_text_file', () => ({ readTextFile: jest.fn() }));
jest.mock('./upload_binary', () => ({ uploadBinary: jest.fn() }));
jest.mock('./upload_image', () => ({
  ...jest.requireActual('./upload_image'),
  processImageFile: jest.fn(),
}));

const addErrorToast = jest.fn();
const chips: Record<PlaceholderKind, string[]> = { image: [], binary: [], text: [] };
const messageEditorController = {
  getPlaceholderNames: (kind: PlaceholderKind = 'image') => chips[kind],
  removePlaceholderByName: jest.fn(),
  setPlaceholderAttachmentId: jest.fn(),
};

const createFile = (name: string, type = '') => new File(['x'], name, { type });

const getNames = (attachments: ConversationAttachment[] = []): string[] =>
  attachments.map((attachment) => {
    if ('items' in attachment) return attachment.label;
    if (attachment.type === 'binary') return attachment.description ?? '';
    return (attachment.data as { name?: string }).name ?? '';
  });

const renderUploads = ({ isBinaryUploadEnabled }: { isBinaryUploadEnabled?: boolean } = {}) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <FakeConversationProvider conversationId="conv-1">{children}</FakeConversationProvider>
    </QueryClientProvider>
  );
  return renderHook(
    () => ({
      uploads: useAttachmentUploads({
        addErrorToast,
        messageEditorController: messageEditorController as never,
        createConversation: jest.fn(),
        isBinaryUploadEnabled,
      }),
      attachments: useConversationContext().attachments,
    }),
    { wrapper }
  );
};

type Rendered = ReturnType<typeof renderUploads>['result'];

const paste = (result: Rendered, files: File[]) => {
  act(() => {
    for (const file of files) {
      const name = result.current.uploads.handlePasteFile(file);
      const kind: PlaceholderKind = file.type === 'application/pdf' ? 'binary' : 'text';
      if (name) chips[file.type.startsWith('image/') ? 'image' : kind].push(name);
    }
  });
};

const deleteChips = (result: Rendered, names: string[]) => {
  for (const kind of Object.keys(chips) as PlaceholderKind[]) {
    chips[kind] = chips[kind].filter((name) => !names.includes(name));
  }
  act(() => result.current.uploads.handleAfterInput());
};

describe('useAttachmentUploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chips.image = [];
    chips.binary = [];
    chips.text = [];
    jest.mocked(readTextFile).mockResolvedValue({ status: 'done', content: 'x' });
    jest.mocked(uploadBinary).mockImplementation(async ({ name }) => ({
      status: 'done',
      attachment: { id: `att-${name}`, type: 'binary', versions: [] } as never,
      fileId: `file-${name}`,
    }));
    jest.mocked(processImageFile).mockImplementation(async ({ name, upsertAttachments }) => {
      upsertAttachments([{ type: 'image', data: { file_id: `file-${name}`, name } }]);
      return true;
    });
  });

  describe('when PDF upload is turned off', () => {
    it('does not accept or upload a PDF, but still reads a text file', async () => {
      const { result } = renderUploads({ isBinaryUploadEnabled: false });

      expect(result.current.uploads.acceptedFileMimeTypes).not.toContain('application/pdf');
      paste(result, [createFile('a.pdf', 'application/pdf'), createFile('b.md')]);
      await waitFor(() => expect(result.current.attachments).toHaveLength(1));

      expect(uploadBinary).not.toHaveBeenCalled();
      expect(getNames(result.current.attachments)).toEqual(['b.md']);
    });
  });

  describe('deleting several chips in one input event', () => {
    it('removes exactly those text files', async () => {
      const { result } = renderUploads();
      paste(result, [createFile('a.md'), createFile('b.txt'), createFile('c.csv')]);
      await waitFor(() => expect(result.current.attachments).toHaveLength(3));

      deleteChips(result, ['a.md', 'b.txt']);

      expect(getNames(result.current.attachments)).toEqual(['c.csv']);
    });

    it('removes exactly those PDFs', async () => {
      const { result } = renderUploads();
      const pdf = (name: string) => createFile(name, 'application/pdf');
      paste(result, [pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
      await waitFor(() => expect(result.current.attachments).toHaveLength(3));

      deleteChips(result, ['a.pdf', 'b.pdf']);

      expect(getNames(result.current.attachments)).toEqual(['c.pdf']);
    });

    it('removes exactly those files when images and text files are mixed', async () => {
      const { result } = renderUploads();
      paste(result, [createFile('a.png', 'image/png'), createFile('b.md'), createFile('c.md')]);
      await waitFor(() => expect(result.current.attachments).toHaveLength(3));

      deleteChips(result, ['a.png', 'b.md']);

      expect(getNames(result.current.attachments)).toEqual(['c.md']);
    });
  });

  describe('many images in one paste', () => {
    it('accepts 10 images and rejects the rest with a toast', () => {
      jest.mocked(processImageFile).mockReturnValue(new Promise(() => {}));
      const { result } = renderUploads();
      const images = Array.from({ length: 11 }, (_, i) => createFile(`${i}.png`, 'image/png'));

      paste(result, images);

      expect(processImageFile).toHaveBeenCalledTimes(10);
      expect(chips.image).toHaveLength(10);
      expect(addErrorToast).toHaveBeenCalledTimes(1);
    });

    it('gives 2 images with the same name their own names and uploads', () => {
      jest.mocked(processImageFile).mockReturnValue(new Promise(() => {}));
      const { result } = renderUploads();

      paste(result, [createFile('a.png', 'image/png'), createFile('a.png', 'image/png')]);

      expect(chips.image).toEqual(['a.png', 'a 2.png']);
      expect(jest.mocked(processImageFile).mock.calls.map(([{ name }]) => name)).toEqual([
        'a.png',
        'a 2.png',
      ]);
    });
  });
});
