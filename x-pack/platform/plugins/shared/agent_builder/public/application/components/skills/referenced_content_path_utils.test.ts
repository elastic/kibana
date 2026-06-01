/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildReferencedContentFullPathPreview,
  normalizeRelativePathSegments,
} from './referenced_content_path_utils';

describe('referenced_content_path_utils', () => {
  describe('normalizeRelativePathSegments', () => {
    it('normalizes root paths', () => {
      expect(normalizeRelativePathSegments('.')).toBe('./');
      expect(normalizeRelativePathSegments('./')).toBe('./');
    });

    it('collapses repeated slashes in a relative path', () => {
      expect(normalizeRelativePathSegments('./templates//notes')).toBe('./templates/notes');
    });
  });

  describe('buildReferencedContentFullPathPreview', () => {
    it('builds a preview without leading ./ in the folder segment', () => {
      expect(
        buildReferencedContentFullPathPreview('Email helper', './templates//notes', 'readme')
      ).toBe('Email helper/templates/notes/readme.md');
    });

    it('omits a subfolder segment for skill root (./)', () => {
      expect(buildReferencedContentFullPathPreview('foo', './', 'hello')).toBe('foo/hello.md');
      expect(buildReferencedContentFullPathPreview('foo', '.', 'hello')).toBe('foo/hello.md');
    });

    it('collapses duplicate slashes produced when joining segments', () => {
      expect(buildReferencedContentFullPathPreview('S', './a', 'f')).toBe('S/a/f.md');
    });
  });
});
