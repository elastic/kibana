/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownImage, getTextarea, isOwner } from './utils';
import type { MarkdownEditorRef } from '../types';

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
  describe('isOwner', () => {
    it('returns true for a valid owner', () => {
      expect(isOwner('cases')).toBe(true);
    });

    it('returns false for an invalid owner', () => {
      expect(isOwner('notAnOwner')).toBe(false);
    });
  });
});
