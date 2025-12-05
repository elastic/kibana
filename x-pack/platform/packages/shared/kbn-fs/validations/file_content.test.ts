/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateAndSanitizeFileData } from './file_content';

// Mock the magic-bytes.js module
jest.mock('magic-bytes.js', () => ({
  filetypemime: jest.fn(),
}));

// Mock the sanitizeSvg function
jest.mock('../sanitizations/svg', () => ({
  sanitizeSvg: jest.fn(),
}));

import { filetypemime } from 'magic-bytes.js';
import { sanitizeSvg } from '../sanitizations/svg';

const mockFiletypemime = filetypemime as jest.MockedFunction<typeof filetypemime>;
const mockSanitizeSvg = sanitizeSvg as jest.MockedFunction<typeof sanitizeSvg>;

describe('validateAndSanitizeFileData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input type conversion', () => {
    it('should handle Buffer input', () => {
      const buffer = Buffer.from('test content');
      mockFiletypemime.mockReturnValue(['text/plain']);

      const result = validateAndSanitizeFileData(buffer, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(buffer);
    });

    it('should handle Uint8Array input', () => {
      const uint8Array = new Uint8Array([116, 101, 115, 116]); // 'test'
      mockFiletypemime.mockReturnValue(['text/plain']);

      const result = validateAndSanitizeFileData(uint8Array, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('test');
    });

    it('should handle string input', () => {
      const string = 'test content';
      mockFiletypemime.mockReturnValue(['text/plain']);

      const result = validateAndSanitizeFileData(string, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('test content');
    });

    it('should handle object with buffer property', () => {
      const buffer = Buffer.from('test content');
      const obj = { buffer };
      mockFiletypemime.mockReturnValue(['text/plain']);

      const result = validateAndSanitizeFileData(obj as any, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(buffer);
    });

    it('should skip validation for streaming content (AsyncIterable)', async () => {
      const streamContent = (async function* () {
        yield Buffer.from('chunk1');
        yield Buffer.from('chunk2');
      })();

      const result = validateAndSanitizeFileData(streamContent as any, 'test.txt');

      expect(result).toBe(streamContent);
      expect(mockFiletypemime).not.toHaveBeenCalled();
    });

    it('should skip validation for streaming content (Stream)', () => {
      const mockStream = {
        pipe: jest.fn(),
      } as any;

      const result = validateAndSanitizeFileData(mockStream, 'test.txt');

      expect(result).toBe(mockStream);
      expect(mockFiletypemime).not.toHaveBeenCalled();
    });
  });

  describe('Iterable input handling', () => {
    it('should convert array of Buffers to single Buffer', () => {
      const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];

      const result = validateAndSanitizeFileData(chunks, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('chunk1chunk2');
    });

    it('should convert array of strings to Buffer', () => {
      const chunks = ['hello', ' ', 'world'];

      const result = validateAndSanitizeFileData(chunks, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('hello world');
    });

    it('should convert array of ArrayBufferView to Buffer', () => {
      const chunks = [
        new Uint8Array([72, 101]), // 'He'
        new Uint8Array([108, 108, 111]), // 'llo'
      ];

      const result = validateAndSanitizeFileData(chunks, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Hello');
    });

    it('should convert mixed array (Buffer, string, ArrayBufferView) to Buffer', () => {
      const chunks = [
        Buffer.from('Hello'),
        ' ',
        new Uint8Array([119, 111, 114, 108, 100]), // 'world'
      ];

      const result = validateAndSanitizeFileData(chunks, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Hello world');
    });

    it('should handle generator function (consumes it)', () => {
      function* generateChunks() {
        yield Buffer.from('part1');
        yield Buffer.from('part2');
        yield Buffer.from('part3');
      }

      const generator = generateChunks();

      const result = validateAndSanitizeFileData(generator, 'test.txt');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('part1part2part3');
      // Generator should be consumed
      expect([...generator]).toEqual([]);
    });

    it('should throw error for unsupported chunk type in Iterable', () => {
      const chunks = [
        Buffer.from('valid'),
        null as any, // Invalid chunk type
      ];

      expect(() => validateAndSanitizeFileData(chunks, 'test.txt')).toThrow(
        'Unsupported chunk type in Iterable'
      );
    });

    it('should validate and sanitize SVG from Iterable', () => {
      const svgChunks = [
        Buffer.from('<svg>'),
        Buffer.from('<rect width="100" height="100"/>'),
        Buffer.from('</svg>'),
      ];
      const sanitizedSvg = Buffer.from('<svg><rect width="100" height="100"/></svg>');

      mockFiletypemime.mockReturnValue(['image/svg+xml']);
      mockSanitizeSvg.mockReturnValue(sanitizedSvg);

      const result = validateAndSanitizeFileData(svgChunks, 'test.svg');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(sanitizedSvg);
      expect(mockSanitizeSvg).toHaveBeenCalled();
    });
  });

  describe('SVG sanitization', () => {
    it('should sanitize SVG content from Buffer', () => {
      const svgContent = Buffer.from('<svg><script>alert("xss")</script></svg>');
      const sanitizedContent = Buffer.from('<svg></svg>');

      mockFiletypemime.mockReturnValue(['image/svg+xml']);
      mockSanitizeSvg.mockReturnValue(sanitizedContent);

      const result = validateAndSanitizeFileData(svgContent, 'test.svg');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(sanitizedContent);
      expect(mockSanitizeSvg).toHaveBeenCalledWith(svgContent);
    });

    it('should sanitize SVG content from string', () => {
      const svgString = '<svg><rect width="100" height="100"/></svg>';
      const sanitizedContent = Buffer.from('<svg><rect width="100" height="100"/></svg>');

      mockFiletypemime.mockReturnValue(['image/svg+xml']);
      mockSanitizeSvg.mockReturnValue(sanitizedContent);

      const result = validateAndSanitizeFileData(svgString, 'test.svg');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(sanitizedContent);
    });

    it('should handle SVG sanitization errors', () => {
      const svgContent = Buffer.from('<svg><script>alert("xss")</script></svg>');
      const sanitizationError = new Error('SVG sanitization failed');

      mockFiletypemime.mockReturnValue(['image/svg+xml']);
      mockSanitizeSvg.mockImplementation(() => {
        throw sanitizationError;
      });

      expect(() => validateAndSanitizeFileData(svgContent, 'test.svg')).toThrow(
        'Failed to sanitize SVG content: SVG sanitization failed'
      );
    });
  });

  describe('integration with file size validation', () => {
    it('should call file size validation', () => {
      mockFiletypemime.mockReturnValue(['text/plain']);

      // This test verifies that validateFileSize is called by checking the error
      // The actual file size validation will throw for content larger than 1GB
      const largeContent = Buffer.alloc(1024 * 1024 * 1024 + 1); // 1GB + 1 byte

      expect(() => validateAndSanitizeFileData(largeContent, 'test.txt')).toThrow(
        'File size exceeds maximum allowed size'
      );
    });
  });

  describe('error handling', () => {
    it('should propagate file content validation errors', () => {
      const content = Buffer.from('invalid');
      mockFiletypemime.mockReturnValue(['application/x-executable']);

      expect(() => validateAndSanitizeFileData(content, 'test.exe')).toThrow(
        'Potential invalid mimetypes detected'
      );
    });

    it('should propagate file content validation errors for Iterable', () => {
      const chunks = [Buffer.from('invalid executable')];
      mockFiletypemime.mockReturnValue(['application/x-executable']);

      expect(() => validateAndSanitizeFileData(chunks, 'test.exe')).toThrow(
        'Potential invalid mimetypes detected'
      );
    });

    it('should propagate file size validation errors', () => {
      // Create a very large buffer that would exceed the size limit
      const largeContent = Buffer.alloc(1024 * 1024 * 1024 + 1); // 1GB + 1 byte

      expect(() => validateAndSanitizeFileData(largeContent, 'test.txt')).toThrow(
        'File size exceeds maximum allowed size'
      );
    });
  });

  describe('text-based file extensions', () => {
    const textExtensions = ['.json', '.yml', '.yaml', '.md', '.txt', '.log', '.csv'];

    textExtensions.forEach((ext) => {
      it(`should skip magic byte validation for ${ext} files`, () => {
        const content = Buffer.from('test content');
        const result = validateAndSanitizeFileData(content, `test${ext}`);

        expect(Buffer.isBuffer(result)).toBe(true);
        expect(mockFiletypemime).not.toHaveBeenCalled();
      });

      it(`should handle ${ext} files from string input`, () => {
        const string = 'test content';
        const result = validateAndSanitizeFileData(string, `test${ext}`);

        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.toString()).toBe('test content');
        expect(mockFiletypemime).not.toHaveBeenCalled();
      });

      it(`should handle ${ext} files from Iterable`, () => {
        const chunks = [Buffer.from('test'), Buffer.from(' content')];
        const result = validateAndSanitizeFileData(chunks, `test${ext}`);

        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.toString()).toBe('test content');
        expect(mockFiletypemime).not.toHaveBeenCalled();
      });
    });
  });
});
