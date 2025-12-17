/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNoPathTraversal } from './path_traversal';
import { REPO_ROOT } from '@kbn/repo-info';
import { join } from 'path';

const DATA_PATH = join(REPO_ROOT, 'data');

describe('validateNoPathTraversal', () => {
  describe('valid paths', () => {
    it('should allow simple file paths', () => {
      expect(() => validateNoPathTraversal(join(DATA_PATH, 'file.txt'))).not.toThrow();
      expect(() => validateNoPathTraversal(join(DATA_PATH, 'folder/file.txt'))).not.toThrow();
      expect(() =>
        validateNoPathTraversal(join(DATA_PATH, 'folder/subfolder/file.txt'))
      ).not.toThrow();
    });

    it('should allow paths with valid characters', () => {
      expect(() => validateNoPathTraversal(join(DATA_PATH, 'file-name_123.txt'))).not.toThrow();
      expect(() => validateNoPathTraversal(join(DATA_PATH, 'folder/file.name.txt'))).not.toThrow();
      expect(() =>
        validateNoPathTraversal(join(DATA_PATH, 'folder/sub-folder/file_name.txt'))
      ).not.toThrow();
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
        'Path traversal detected: file\0.txt'
      );
      expect(() => validateNoPathTraversal('folder\0/file.txt')).toThrow(
        'Path traversal detected: folder\0/file.txt'
      );
      expect(() => validateNoPathTraversal('file%00.txt')).toThrow(
        'Path traversal detected: file%00.txt'
      );
      expect(() => validateNoPathTraversal('folder%00/file.txt')).toThrow(
        'Path traversal detected: folder%00/file.txt'
      );
    });

    it('should detect null bytes in middle of path', () => {
      expect(() => validateNoPathTraversal('folder\0subfolder/file.txt')).toThrow(
        'Path traversal detected: folder\0subfolder/file.txt'
      );
      expect(() => validateNoPathTraversal('folder%00subfolder/file.txt')).toThrow(
        'Path traversal detected: folder%00subfolder/file.txt'
      );
    });
  });

  describe('URL encoded path sequences', () => {
    it('should detect URL encoded path traversal', () => {
      expect(() => validateNoPathTraversal('%2e%2e%2f')).toThrow(
        'Path traversal detected: %2e%2e%2f'
      );
      expect(() => validateNoPathTraversal('%2e%2e%5c')).toThrow(
        'Path traversal detected: %2e%2e%5c'
      );
      expect(() => validateNoPathTraversal('folder%2f..%2f')).toThrow(
        'Path traversal detected: folder%2f..%2f'
      );
    });

    it('should detect mixed case URL encoding', () => {
      expect(() => validateNoPathTraversal('%2E%2E%2F')).toThrow(
        'Path traversal detected: %2E%2E%2F'
      );
      expect(() => validateNoPathTraversal('%2e%2E%2f')).toThrow(
        'Path traversal detected: %2e%2E%2f'
      );
    });

    it('should detect URL encoded sequences in middle of path', () => {
      expect(() => validateNoPathTraversal('folder%2f..%2fother')).toThrow(
        'Path traversal detected: folder%2f..%2fother'
      );
      expect(() => validateNoPathTraversal('folder%2e%2e%2fother')).toThrow(
        'Path traversal detected: folder%2e%2e%2fother'
      );
    });

    it('should allow valid URL encoded characters that are not path traversal', () => {
      expect(() => validateNoPathTraversal(join(DATA_PATH, 'file%20name.txt'))).not.toThrow(); // space
      expect(() => validateNoPathTraversal(join(DATA_PATH, 'file%2dname.txt'))).not.toThrow(); // hyphen
    });
  });
});
