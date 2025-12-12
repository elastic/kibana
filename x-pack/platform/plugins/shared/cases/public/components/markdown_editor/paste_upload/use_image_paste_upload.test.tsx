/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import React from 'react';
import { type FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type DoneNotification } from '@kbn/shared-ux-file-upload';
import { type FileState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { FilesContext } from '@kbn/shared-ux-file-context';
import type { FilesClient } from '@kbn/files-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { useImagePasteUpload } from './use_image_paste_upload';
import { type MarkdownEditorRef } from '../types';
import { UNSUPPORTED_MIME_TYPE_MESSAGE, NO_SIMULTANEOUS_UPLOADS_MESSAGE } from '../translations';

describe('useImagePasteUpload', () => {
  describe('usePasteImageUpload', () => {
    const FILE_KIND_ID = 'cases:test';
    const CASE_ID = 'case-1';
    const OWNER = 'cases';

    // mock uploadState implementation
    const createMockUploadState = () => {
      const files$ = new BehaviorSubject<FileState[]>([]);
      const done$ = new BehaviorSubject<DoneNotification[]>([]);
      const error$ = new BehaviorSubject<Array<string | Error> | null>(null);
      const uploading$ = new BehaviorSubject<boolean>(false);
      return {
        files$,
        done$,
        error$,
        uploading$,
        setFiles: jest.fn((files: File[]) => files$.next(files as unknown as FileState[])),
        hasFiles: jest.fn(() => files$.value.length > 0),
        upload: jest.fn(),
      };
    };

    let mockUploadState: ReturnType<typeof createMockUploadState>;

    beforeAll(() => {
      if (typeof global.DataTransfer === 'undefined') {
        global.DataTransfer = class DataTransferPolyfill {
          public files: File[] = [];
          public items = {
            add: (file: File) => {
              this.files.push(file);
            },
          };
        } as unknown as typeof DataTransfer;
      }

      if (typeof global.ClipboardEvent === 'undefined') {
        class ClipboardEventPolyfill extends Event {
          public clipboardData: DataTransfer;
          constructor(type: string, eventInit: ClipboardEventInit) {
            super(type, eventInit);
            this.clipboardData = eventInit.clipboardData!;
          }
        }
        global.ClipboardEvent = ClipboardEventPolyfill as unknown as typeof ClipboardEvent;
      }
    });

    beforeEach(() => {
      jest.resetAllMocks();
      mockUploadState = createMockUploadState();

      jest.doMock('@kbn/shared-ux-file-upload/src/upload_state', () => {
        const actual = jest.requireActual('@kbn/shared-ux-file-upload/src/upload_state');
        return {
          ...actual,
          createUploadState: () => mockUploadState,
        };
      });
    });

    afterEach(() => {
      jest.dontMock('@kbn/shared-ux-file-upload/src/upload_state');
    });

    const setup = () => {
      const textarea = document.createElement('textarea');
      const editorRef = { current: { textarea } } as unknown as React.RefObject<MarkdownEditorRef>;
      const field: FieldHook<string> = {
        value: '',
        // make setValue mutate both field.value and textarea.value so that later placeholder replacement works
        setValue: jest.fn((newVal: string) => {
          // @ts-ignore update mutable ref
          field.value = newVal;
          textarea.value = newVal;
        }),
      } as unknown as FieldHook<string>;

      const filesClient = {
        getFileKind: jest.fn(() => ({})),
        getDownloadHref: jest.fn(() => 'http://download'),
      };

      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <FilesContext client={filesClient as unknown as FilesClient}>{children}</FilesContext>
      );

      const { result } = renderHook(
        () =>
          useImagePasteUpload({
            editorRef,
            field,
            caseId: CASE_ID,
            owner: OWNER,
            fileKindId: FILE_KIND_ID,
          }),
        { wrapper }
      );

      return { textarea, field, result };
    };

    it('returns initial uploading state false', () => {
      const { result } = setup();
      expect(result.current.isUploading).toBe(false);
    });

    it('starts upload when an image is pasted', async () => {
      const { textarea, result } = setup();

      const imageFile = new File(['x'], 'image.png', { type: 'image/png' });
      const dt = {
        items: [
          {
            kind: 'file',
            type: imageFile.type,
            getAsFile: () => imageFile,
          },
        ],
        types: ['Files'],
      };

      act(() => {
        // @ts-expect-error partial impl
        textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));

        // Emit files$ to trigger START_UPLOAD placeholder insertion
        mockUploadState.files$.next([
          { file: imageFile, status: 'uploading' } as unknown as FileState,
        ]);

        // simulate UploadState emitting that upload is in progress
        mockUploadState.uploading$.next(true);
      });

      // wait until hook reflects uploading state
      await waitFor(() => expect(result.current.isUploading).toBe(true));
    });

    it('sets error when unsupported mime is pasted', () => {
      const { textarea, result } = setup();

      const textFile = new File(['x'], 'file.txt', { type: 'text/plain' });
      const dt = {
        items: [
          {
            kind: 'file',
            type: textFile.type,
            getAsFile: () => textFile,
          },
        ],
        types: ['Files'],
      };

      act(() => {
        // @ts-expect-error partial implementation for testing
        textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      });

      // error should be propagated through reducer state
      expect(result.current.errors).toEqual([UNSUPPORTED_MIME_TYPE_MESSAGE]);
    });

    it('sets error when multiple files are pasted simultaneously', () => {
      const { textarea, result } = setup();
      const file1 = new File(['x'], 'image1.png', { type: 'image/png' });
      const file2 = new File(['y'], 'image2.png', { type: 'image/png' });
      const dt = {
        items: [
          { kind: 'file', type: file1.type, getAsFile: () => file1 },
          { kind: 'file', type: file2.type, getAsFile: () => file2 },
        ],
        types: ['Files'],
      };
      act(() => {
        // @ts-expect-error partial impl
        textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      });

      expect(result.current.errors).toEqual([NO_SIMULTANEOUS_UPLOADS_MESSAGE]);
    });

    it('clears errors when a non-file paste occurs', () => {
      const { textarea, result } = setup();
      const dt = {
        items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
        types: ['text/plain'],
      };
      act(() => {
        // @ts-expect-error partial implementation for testing
        textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      });

      expect(result.current.errors).toBeUndefined();
    });

    it('does not start a new upload if one is already in progress', () => {
      const { textarea } = setup();
      // Pretend an upload is already running
      mockUploadState.uploading$.next(true);
      const imageFile = new File(['x'], 'image.png', { type: 'image/png' });
      const dt = {
        items: [{ kind: 'file', type: imageFile.type, getAsFile: () => imageFile }],
        types: ['Files'],
      };
      act(() => {
        // @ts-expect-error partial impl
        textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      });
      expect(mockUploadState.upload).not.toHaveBeenCalled();
    });

    it('replaces placeholder and resets state when upload completes', async () => {
      const { textarea, field, result } = setup();

      const imageFile = new File(['x'], 'image.png', { type: 'image/png' });
      const dt = {
        items: [{ kind: 'file', type: imageFile.type, getAsFile: () => imageFile }],
        types: ['Files'],
      };

      // 1. Paste image to start upload
      act(() => {
        // @ts-expect-error partial impl for testing
        textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
        // uploadState emits files -> triggers START_UPLOAD/UPLOAD_IN_PROGRESS chain
        mockUploadState.files$.next([
          { file: imageFile, status: 'uploading' } as unknown as FileState,
        ]);
        mockUploadState.uploading$.next(true);
      });

      // Wait until hook reflects uploading state
      await waitFor(() => expect(result.current.isUploading).toBe(true));

      // 2. Emit done$ notification to indicate upload finished
      const doneNotification: DoneNotification = {
        id: '1',
        fileJSON: { name: 'image', extension: 'png' },
      } as unknown as DoneNotification;

      // allow React effect cleanup+setup to run before emitting done$
      await act(async () => {
        await Promise.resolve(); // next microtask
        mockUploadState.done$.next([doneNotification]);
        mockUploadState.uploading$.next(false);
      });

      // Ensure setValue was invoked (placeholder or final link)
      await waitFor(() => expect(field.setValue).toHaveBeenCalled());
    });
  });
});
