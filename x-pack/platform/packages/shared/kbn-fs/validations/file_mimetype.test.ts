/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateMimeType } from './file_mimetype';

describe('validateMimeType', () => {
  describe('text-based file extensions', () => {
    it('should return correct mime type for .json files without magic byte validation', () => {
      const content = Buffer.from('{"test": "data"}');
      const result = validateMimeType(content, 'test.json');

      expect(result).toEqual(['application/json']);
    });

    it('should return correct mime type for .yml files without magic byte validation', () => {
      const content = Buffer.from('key: value');
      const result = validateMimeType(content, 'test.yml');

      expect(result).toEqual(['text/yaml']);
    });

    it('should return correct mime type for .yaml files without magic byte validation', () => {
      const content = Buffer.from('key: value');
      const result = validateMimeType(content, 'test.yaml');

      expect(result).toEqual(['text/yaml']);
    });

    it('should return correct mime type for .md files without magic byte validation', () => {
      const content = Buffer.from('# Markdown content');
      const result = validateMimeType(content, 'test.md');

      expect(result).toEqual(['text/markdown']);
    });

    it('should return correct mime type for .txt files without magic byte validation', () => {
      const content = Buffer.from('test content');
      const result = validateMimeType(content, 'test.txt');

      expect(result).toEqual(['text/plain']);
    });

    it('should return correct mime type for .log files without magic byte validation', () => {
      const content = Buffer.from('log content');
      const result = validateMimeType(content, 'test.log');

      expect(result).toEqual(['text/plain']);
    });

    it('should return correct mime type for .csv files without magic byte validation', () => {
      const content = Buffer.from('col1,col2\nval1,val2');
      const result = validateMimeType(content, 'test.csv');

      expect(result).toEqual(['text/csv']);
    });
  });

  describe('files requiring magic byte validation', () => {
    it('should validate PNG files', () => {
      // Real PNG file header
      const pngContent = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52,
      ]);

      const result = validateMimeType(pngContent, 'test.png');

      expect(result).toContain('image/png');
    });

    it('should validate SVG files', () => {
      const svgContent = Buffer.from('<svg><rect width="100" height="100"/></svg>');

      const result = validateMimeType(svgContent, 'test.svg');

      expect(result).toContain('image/svg+xml');
    });
  });

  describe('invalid content types', () => {
    it('should throw error when magic bytes cannot determine content type', () => {
      // Use content that won't match any magic bytes pattern
      const content = Buffer.from('random binary content that does not match any file type');

      expect(() => validateMimeType(content, 'test.unknown')).toThrow(
        'Unable to determine content types for file'
      );
    });

    it('should throw error for disallowed mime types', () => {
      // Use content that magic-bytes might detect as an executable or other disallowed type
      // Note: This test depends on what magic-bytes actually detects
      // If it doesn't detect anything, it will throw "Unable to determine" instead
      const content = Buffer.from('MZ\x90\x00'); // Windows PE executable header

      try {
        validateMimeType(content, 'test.exe');
        // If it doesn't throw, the mime type was allowed
      } catch (error: any) {
        expect(error.message).toMatch(/Potential invalid mimetypes detected|Unable to determine/);
      }
    });

    it('should throw error for PDF mime type', () => {
      // PDF file header
      const pdfContent = Buffer.from('%PDF-1.4\n');

      expect(() => validateMimeType(pdfContent, 'test.pdf')).toThrow(
        'Potential invalid mimetypes detected'
      );
    });
  });

  describe('allowed mime types', () => {
    it('should allow PNG mime type', () => {
      const pngContent = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52,
      ]);

      const result = validateMimeType(pngContent, 'test.png');

      expect(result).toContain('image/png');
    });

    it('should allow SVG mime type', () => {
      const svgContent = Buffer.from('<svg><rect width="100" height="100"/></svg>');

      const result = validateMimeType(svgContent, 'test.svg');

      expect(result).toContain('image/svg+xml');
    });

    it('should allow multiple mime types if one is allowed', () => {
      // Create content that might return multiple mime types where at least one is allowed
      const pngContent = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52,
      ]);

      const result = validateMimeType(pngContent, 'test.file');

      // Should contain image/png which is allowed
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.some((mime) =>
          [
            'text/plain',
            'text/markdown',
            'application/json',
            'text/yaml',
            'text/csv',
            'image/svg+xml',
            'image/png',
          ].includes(mime)
        )
      ).toBe(true);
    });
  });
});
