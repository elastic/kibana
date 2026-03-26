/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFileExtension } from './file_extension';

describe('validateFileExtension', () => {
  describe('valid file extensions', () => {
    it('should allow all supported text file extensions', () => {
      expect(() => validateFileExtension('file.txt')).not.toThrow();
      expect(() => validateFileExtension('file.md')).not.toThrow();
      expect(() => validateFileExtension('file.log')).not.toThrow();
      expect(() => validateFileExtension('file.json')).not.toThrow();
      expect(() => validateFileExtension('file.yml')).not.toThrow();
      expect(() => validateFileExtension('file.yaml')).not.toThrow();
      expect(() => validateFileExtension('file.csv')).not.toThrow();
    });

    it('should allow image file extensions', () => {
      expect(() => validateFileExtension('file.svg')).not.toThrow();
      expect(() => validateFileExtension('file.png')).not.toThrow();
    });

    it('should handle case insensitive extensions', () => {
      expect(() => validateFileExtension('file.TXT')).not.toThrow();
      expect(() => validateFileExtension('file.MD')).not.toThrow();
      expect(() => validateFileExtension('file.JSON')).not.toThrow();
      expect(() => validateFileExtension('file.SVG')).not.toThrow();
      expect(() => validateFileExtension('file.PNG')).not.toThrow();
      expect(() => validateFileExtension('file.Txt')).not.toThrow();
      expect(() => validateFileExtension('file.Md')).not.toThrow();
    });

    it('should handle files with paths', () => {
      expect(() => validateFileExtension('folder/file.txt')).not.toThrow();
      expect(() => validateFileExtension('folder/subfolder/file.md')).not.toThrow();
      expect(() => validateFileExtension('folder/subfolder/file.json')).not.toThrow();
    });

    it('should handle files with complex names', () => {
      expect(() => validateFileExtension('file-name_123.txt')).not.toThrow();
      expect(() => validateFileExtension('file.name.txt')).not.toThrow();
      expect(() => validateFileExtension('file_name-123.md')).not.toThrow();
    });

    it('should handle files with multiple dots', () => {
      expect(() => validateFileExtension('file.backup.txt')).not.toThrow();
      expect(() => validateFileExtension('file.2023.12.01.log')).not.toThrow();
      expect(() => validateFileExtension('file.v1.2.json')).not.toThrow();
    });
  });

  describe('invalid file extensions', () => {
    it('should reject files with unsupported extensions or empty extension', () => {
      const unsupportedExtensions = [
        '.doc',
        '.pdf',
        '.exe',
        '.bat',
        '.cmd',
        '.sh',
        '.ps1',
        '.',
        '',
        '.backup.exe',
      ];
      unsupportedExtensions.forEach((extension) => {
        expect(() => validateFileExtension(`file${extension}`)).toThrow(
          `Invalid file type: "file${extension}". Only .txt, .md, .log, .json, .yml, .yaml, .csv, .svg, .png, .zip files are allowed.`
        );
      });
    });
  });
});
