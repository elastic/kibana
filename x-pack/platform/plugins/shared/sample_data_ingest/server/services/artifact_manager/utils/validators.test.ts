/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { open } from 'fs/promises';
import { validatePath, validateUrl, validateMimeType, validateFileSignature } from './validators';

jest.mock('fs/promises', () => ({
  open: jest.fn(),
}));

describe('validators', () => {
  describe('validatePath', () => {
    it('should allow valid file paths', () => {
      expect(() => validatePath('file.txt')).not.toThrow();
      expect(() => validatePath('./file.txt')).not.toThrow();
      expect(() => validatePath('folder/file.txt')).not.toThrow();
      expect(() => validatePath('artifacts/data.zip')).not.toThrow();
    });

    it('should block path traversal attempts', () => {
      expect(() => validatePath('../file.txt')).toThrow('Path traversal attempt detected');
      expect(() => validatePath('../../secret.txt')).toThrow('Path traversal attempt detected');
      expect(() => validatePath('folder/../../../etc/passwd')).toThrow(
        'Path traversal attempt detected'
      );
    });
  });

  describe('validateUrl', () => {
    it('should allow valid URLs', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
      expect(() => validateUrl('http://example.com/path')).not.toThrow();
      expect(() => validateUrl('file:///tmp/local')).not.toThrow();
    });

    it('should block unsupported protocols', () => {
      expect(() => validateUrl('ftp://example.com')).toThrow('Unsupported protocol: ftp:');
      // eslint-disable-next-line no-script-url
      expect(() => validateUrl('javascript:alert(1)')).toThrow('Unsupported protocol: javascript:');
      expect(() => validateUrl('data:text/plain,hello')).toThrow('Unsupported protocol: data:');
    });

    it('should handle invalid URL formats', () => {
      expect(() => validateUrl('not-a-url')).toThrow('Invalid URL');
      expect(() => validateUrl('')).toThrow('Invalid URL');
    });
  });

  describe('validateMimeType', () => {
    it('should allow matching MIME types', () => {
      expect(() => validateMimeType('application/zip', 'application/zip')).not.toThrow();
      expect(() => validateMimeType('text/plain', 'text/plain')).not.toThrow();
      expect(() =>
        validateMimeType('application/xml; charset=utf-8', 'application/xml')
      ).not.toThrow();
    });

    it('should reject mismatched MIME types', () => {
      expect(() => validateMimeType('text/plain', 'application/zip')).toThrow(
        'Invalid MIME type: text/plain. Expected: application/zip'
      );
      expect(() => validateMimeType('application/json', 'application/xml')).toThrow(
        'Invalid MIME type: application/json. Expected: application/xml'
      );
    });

    it('should reject missing Content-Type header', () => {
      expect(() => validateMimeType(null, 'application/zip')).toThrow(
        'Missing Content-Type header'
      );
    });
  });

  describe('validateFileSignature', () => {
    const mockFileHandle = {
      read: jest.fn(),
      close: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (open as jest.Mock).mockResolvedValue(mockFileHandle);
      mockFileHandle.close.mockResolvedValue(undefined);
    });

    it('should validate ZIP file signature', async () => {
      // ZIP signature: PK (0x50 0x4B)
      const zipBuffer = Buffer.alloc(8);
      zipBuffer[0] = 0x50; // P
      zipBuffer[1] = 0x4b; // K

      mockFileHandle.read.mockImplementation((buffer) => {
        buffer.set(zipBuffer);
        return Promise.resolve({ bytesRead: 8 });
      });

      await expect(validateFileSignature('file.zip', 'application/zip')).resolves.not.toThrow();

      expect(open).toHaveBeenCalledWith('file.zip', 'r');
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it('should validate XML file signature', async () => {
      // XML signature: <? (0x3C 0x3F)
      const xmlBuffer = Buffer.alloc(8);
      xmlBuffer[0] = 0x3c; // <
      xmlBuffer[1] = 0x3f; // ?

      mockFileHandle.read.mockImplementation((buffer) => {
        buffer.set(xmlBuffer);
        return Promise.resolve({ bytesRead: 8 });
      });

      await expect(validateFileSignature('file.xml', 'application/xml')).resolves.not.toThrow();
    });

    it('should reject invalid ZIP signature', async () => {
      const invalidBuffer = Buffer.alloc(8);
      invalidBuffer[0] = 0x00;
      invalidBuffer[1] = 0x00;

      mockFileHandle.read.mockImplementation((buffer) => {
        buffer.set(invalidBuffer);
        return Promise.resolve({ bytesRead: 8 });
      });

      await expect(validateFileSignature('file.zip', 'application/zip')).rejects.toThrow(
        'File content does not match ZIP format'
      );
    });

    it('should reject invalid XML signature', async () => {
      const invalidBuffer = Buffer.alloc(8);
      invalidBuffer[0] = 0x00;
      invalidBuffer[1] = 0x00;

      mockFileHandle.read.mockImplementation((buffer) => {
        buffer.set(invalidBuffer);
        return Promise.resolve({ bytesRead: 8 });
      });

      await expect(validateFileSignature('file.xml', 'application/xml')).rejects.toThrow(
        'File content does not match XML format'
      );
    });

    it('should reject unsupported MIME types', async () => {
      await expect(validateFileSignature('file.txt', 'text/plain')).rejects.toThrow(
        'File signature validation is not supported for MIME type: text/plain'
      );
    });

    it('should close file handle even if validation fails', async () => {
      const invalidBuffer = Buffer.alloc(8);
      mockFileHandle.read.mockImplementation((buffer) => {
        buffer.set(invalidBuffer);
        return Promise.resolve({ bytesRead: 8 });
      });

      await expect(validateFileSignature('file.zip', 'application/zip')).rejects.toThrow();

      expect(mockFileHandle.close).toHaveBeenCalled();
    });
  });
});
