/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNoPathTraversal } from './path_traversal';

describe('validateNoPathTraversal', () => {
  describe('valid paths', () => {
    it('should allow simple file paths', () => {
      expect(() => validateNoPathTraversal('file.txt')).not.toThrow();
      expect(() => validateNoPathTraversal('folder/file.txt')).not.toThrow();
      expect(() => validateNoPathTraversal('folder/subfolder/file.txt')).not.toThrow();
    });

    it('should allow paths with valid characters', () => {
      expect(() => validateNoPathTraversal('file-name_123.txt')).not.toThrow();
      expect(() => validateNoPathTraversal('folder/file.name.txt')).not.toThrow();
      expect(() => validateNoPathTraversal('folder/sub-folder/file_name.txt')).not.toThrow();
    });

    it('should allow single dots in paths', () => {
      expect(() => validateNoPathTraversal('./file.txt')).not.toThrow();
      expect(() => validateNoPathTraversal('folder/./file.txt')).not.toThrow();
    });

    it('should allow empty string', () => {
      expect(() => validateNoPathTraversal('')).not.toThrow();
    });
  });

  describe('path traversal detection', () => {
    it('should detect basic path traversal patterns', () => {
      expect(() => validateNoPathTraversal('../file.txt')).toThrow(
        'Path traversal detected: ../file.txt'
      );
      expect(() => validateNoPathTraversal('../../file.txt')).toThrow(
        'Path traversal detected: ../../file.txt'
      );
      expect(() => validateNoPathTraversal('../../../file.txt')).toThrow(
        'Path traversal detected: ../../../file.txt'
      );
    });

    it('should detect path traversal in middle of path', () => {
      expect(() => validateNoPathTraversal('folder/../other/file.txt')).toThrow(
        'Path traversal detected: folder/../other/file.txt'
      );
      expect(() => validateNoPathTraversal('folder/../../other/file.txt')).toThrow(
        'Path traversal detected: folder/../../other/file.txt'
      );
    });

    it('should detect path traversal with backslashes', () => {
      expect(() => validateNoPathTraversal('..\\file.txt')).toThrow(
        'Path traversal detected: ..\\file.txt'
      );
      expect(() => validateNoPathTraversal('folder\\..\\other\\file.txt')).toThrow(
        'Path traversal detected: folder\\..\\other\\file.txt'
      );
    });

    it('should detect multiple consecutive dots', () => {
      expect(() => validateNoPathTraversal('..../file.txt')).toThrow(
        'Path traversal detected: ..../file.txt'
      );
      expect(() => validateNoPathTraversal('folder/..../file.txt')).toThrow(
        'Path traversal detected: folder/..../file.txt'
      );
    });

    it('should detect path traversal with mixed separators', () => {
      expect(() => validateNoPathTraversal('folder/..\\file.txt')).toThrow(
        'Path traversal detected: folder/..\\file.txt'
      );
      expect(() => validateNoPathTraversal('folder\\../file.txt')).toThrow(
        'Path traversal detected: folder\\../file.txt'
      );
    });
  });

  describe('null byte detection', () => {
    it('should detect null bytes in paths', () => {
      expect(() => validateNoPathTraversal('file\0.txt')).toThrow(
        'Null bytes not allowed in paths'
      );
      expect(() => validateNoPathTraversal('folder\0/file.txt')).toThrow(
        'Null bytes not allowed in paths'
      );
      expect(() => validateNoPathTraversal('file%00.txt')).toThrow(
        'Null bytes not allowed in paths'
      );
      expect(() => validateNoPathTraversal('folder%00/file.txt')).toThrow(
        'Null bytes not allowed in paths'
      );
    });

    it('should detect null bytes in middle of path', () => {
      expect(() => validateNoPathTraversal('folder\0subfolder/file.txt')).toThrow(
        'Null bytes not allowed in paths'
      );
      expect(() => validateNoPathTraversal('folder%00subfolder/file.txt')).toThrow(
        'Null bytes not allowed in paths'
      );
    });
  });

  describe('URL encoded path sequences', () => {
    it('should detect URL encoded path traversal', () => {
      expect(() => validateNoPathTraversal('%2e%2e%2f')).toThrow(
        'URL encoded path sequences not allowed'
      );
      expect(() => validateNoPathTraversal('%2e%2e%5c')).toThrow(
        'URL encoded path sequences not allowed'
      );
      expect(() => validateNoPathTraversal('folder%2f..%2f')).toThrow(
        'URL encoded path sequences not allowed'
      );
    });

    it('should detect mixed case URL encoding', () => {
      expect(() => validateNoPathTraversal('%2E%2E%2F')).toThrow(
        'URL encoded path sequences not allowed'
      );
      expect(() => validateNoPathTraversal('%2e%2E%2f')).toThrow(
        'URL encoded path sequences not allowed'
      );
    });

    it('should detect URL encoded sequences in middle of path', () => {
      expect(() => validateNoPathTraversal('folder%2f..%2fother')).toThrow(
        'URL encoded path sequences not allowed'
      );
      expect(() => validateNoPathTraversal('folder%2e%2e%2fother')).toThrow(
        'URL encoded path sequences not allowed'
      );
    });

    it('should allow valid URL encoded characters that are not path traversal', () => {
      expect(() => validateNoPathTraversal('file%20name.txt')).not.toThrow(); // space
      expect(() => validateNoPathTraversal('file%2dname.txt')).not.toThrow(); // hyphen
    });
  });
});
