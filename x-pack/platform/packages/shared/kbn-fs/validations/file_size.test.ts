/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFileSize } from './file_size';

describe('validateFileSize', () => {
  const MAX_FILE_SIZE = 1024 * 1024 * 1024;

  describe('valid file sizes', () => {
    it('should allow empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(() => validateFileSize(emptyBuffer)).not.toThrow();
      expect(validateFileSize(emptyBuffer)).toBe(true);
    });

    it('should allow small files', () => {
      const smallBuffer = Buffer.alloc(1024); // 1KB
      expect(() => validateFileSize(smallBuffer)).not.toThrow();
      expect(validateFileSize(smallBuffer)).toBe(true);
    });

    it('should allow medium files', () => {
      const mediumBuffer = Buffer.alloc(1024 * 1024); // 1MB
      expect(() => validateFileSize(mediumBuffer)).not.toThrow();
      expect(validateFileSize(mediumBuffer)).toBe(true);
    });
  });

  describe('invalid file sizes', () => {
    it('should reject significantly oversized files', () => {
      const veryLargeBuffer = Buffer.alloc(MAX_FILE_SIZE * 2);
      expect(() => validateFileSize(veryLargeBuffer)).toThrow(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
      );
    });
  });
});
