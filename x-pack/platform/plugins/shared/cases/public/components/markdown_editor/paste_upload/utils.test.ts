/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownImage, getTextarea, canUpload } from './utils';
import type { MarkdownEditorRef } from '../types';
import type { UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';

describe('utils', () => {
  describe('markdownImage', () => {
    it('returns markdown image with filename only when extension is not provided', () => {
      const result = markdownImage('image', 'http://example.com/image');
      expect(result).toBe('![image](http://example.com/image)');
    });

    it('returns markdown image with filename and extension when extension is provided', () => {
      const result = markdownImage('image', 'http://example.com/image', 'png');
      expect(result).toBe('![image.png](http://example.com/image)');
    });
  });
  describe('getTextarea', () => {
    it('returns the textarea when given an object ref containing textarea', () => {
      const textarea = document.createElement('textarea');
      const ref = { current: { textarea } } as unknown as React.ForwardedRef<MarkdownEditorRef>;
      // Type cast because we only care about shape for the test
      const result = getTextarea(ref as unknown as React.ForwardedRef<MarkdownEditorRef | null>);
      expect(result).toBe(textarea);
    });

    it('returns null when ref is null', () => {
      const result = getTextarea(null);
      expect(result).toBeNull();
    });

    it('returns null when ref is a callback function', () => {
      const callbackRef: React.ForwardedRef<MarkdownEditorRef | null> = () => {};
      const result = getTextarea(callbackRef);
      expect(result).toBeNull();
    });
  });
  describe('canUpload', () => {
    const CASE_ID = 'case-123';

    // Minimal mock implementation – just the pieces needed for canUpload
    const mockUploadState = (hasFiles: boolean, uploading: boolean): UploadState =>
      ({
        hasFiles: () => hasFiles,
        isUploading: () => uploading,
        // The remaining members of UploadState are not needed for this test suite.
      } as unknown as UploadState);

    it('returns truthy when there are files, not uploading, and caseId provided', () => {
      const state = mockUploadState(true, false);
      expect(canUpload(state, CASE_ID)).toBe(CASE_ID);
    });

    it('returns false when no files are present', () => {
      const state = mockUploadState(false, false);
      expect(canUpload(state, CASE_ID)).toBe(false);
    });

    it('returns false when an upload is already in progress', () => {
      const state = mockUploadState(true, true);
      expect(canUpload(state, CASE_ID)).toBe(false);
    });

    it('returns false when caseId is empty', () => {
      const state = mockUploadState(true, false);
      expect(canUpload(state, '')).toBe('');
    });
  });
});
