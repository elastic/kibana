/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  sanitizeFileName,
  getSafePath,
  ensureDirectory,
  ensureDirectorySync,
  sanitizeVolume,
} from './utils';

const DATA_PATH = join(REPO_ROOT, 'data');

describe('kbn-fs utils', () => {
  describe('sanitizeFileName', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeFileName('file:with*chars?.txt')).toBe('filewithchars.txt');
      expect(sanitizeFileName('file<with>chars|.txt')).toBe('filewithchars.txt');
      expect(sanitizeFileName('file"with\'chars.txt')).toBe('filewithchars.txt');
    });

    it('should remove path traversal attempts', () => {
      expect(() => sanitizeFileName('../../../etc/passwd')).toThrow(
        'Path traversal detected: ../../../etc/passwd'
      );
      expect(() => sanitizeFileName('file/../../other.txt')).toThrow(
        'Path traversal detected: file/../../other.txt'
      );
    });

    it('should preserve safe characters', () => {
      expect(sanitizeFileName('file-name_123.txt')).toBe('file-name_123.txt');
      expect(sanitizeFileName('file.name.txt')).toBe('file.name.txt');
      expect(sanitizeFileName('FILE_NAME-123.TXT')).toBe('FILE_NAME-123.TXT');
    });

    it('should handle empty string', () => {
      expect(sanitizeFileName('')).toBe('');
    });

    it('should handle string with only dangerous characters', () => {
      expect(sanitizeFileName('*?:<>|')).toBe('');
    });
  });

  describe('sanitizeVolume', () => {
    it('should allow valid volume names', () => {
      expect(() => sanitizeVolume('reports')).not.toThrow();
      expect(() => sanitizeVolume('exports')).not.toThrow();
      expect(() => sanitizeVolume('reports_2024')).not.toThrow();
      expect(() => sanitizeVolume('reports/2024')).not.toThrow();
      expect(() => sanitizeVolume('reports/2024/january')).not.toThrow();
      expect(() => sanitizeVolume('data_export_2024')).not.toThrow();
      expect(() => sanitizeVolume('a')).not.toThrow();
      expect(() => sanitizeVolume('123')).not.toThrow();
      expect(() => sanitizeVolume('_private')).not.toThrow();
    });

    it('should reject invalid volume names', () => {
      expect(() => sanitizeVolume('reports../2024')).toThrow(
        'Invalid volume name: reports../2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports*2024')).toThrow(
        'Invalid volume name: reports*2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports?2024')).toThrow(
        'Invalid volume name: reports?2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports<2024')).toThrow(
        'Invalid volume name: reports<2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports>2024')).toThrow(
        'Invalid volume name: reports>2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports|2024')).toThrow(
        'Invalid volume name: reports|2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports"2024')).toThrow(
        'Invalid volume name: reports"2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume("reports'2024")).toThrow(
        "Invalid volume name: reports'2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators."
      );
      expect(() => sanitizeVolume('reports\\2024')).toThrow(
        'Invalid volume name: reports\\2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports 2024')).toThrow(
        'Invalid volume name: reports 2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports\t2024')).toThrow(
        'Invalid volume name: reports\t2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => sanitizeVolume('reports\n2024')).toThrow(
        'Invalid volume name: reports\n2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
    });

    it('should reject empty volume names', () => {
      expect(() => sanitizeVolume('')).toThrow(
        'Invalid volume name: . Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
    });

    it('should allow complex valid volume names', () => {
      expect(() => sanitizeVolume('reports_2024/january/data')).not.toThrow();
      expect(() => sanitizeVolume('exports/user_data/backup_2024')).not.toThrow();
      expect(() => sanitizeVolume('temp_files/processing/stage_1')).not.toThrow();
      expect(() => sanitizeVolume('A1B2C3_Test/SubDir')).not.toThrow();
    });
  });

  describe('getSafePath', () => {
    it('should create safe path without volume', () => {
      const result = getSafePath('test-file.txt');

      expect(result.fullPath).toBe(join(DATA_PATH, 'test-file.txt'));
      expect(result.alias).toBe('disk:data/test-file.txt');
    });

    it('should create safe path with volume', () => {
      const result = getSafePath('test-file.txt', 'reports');

      expect(result.fullPath).toBe(join(DATA_PATH, 'reports', 'test-file.txt'));
      expect(result.alias).toBe('disk:data/reports/test-file.txt');
    });

    it('should sanitize file name', () => {
      const result = getSafePath('file/with*chars?.txt');

      expect(result.fullPath).toBe(join(DATA_PATH, 'filewithchars.txt'));
      expect(result.alias).toBe('disk:data/filewithchars.txt');
    });

    it('should resolve absolute path', () => {
      const result = getSafePath('test.txt');

      expect(result.fullPath).toMatch(/^\/.*\/data\/test\.txt$/);
      expect(result.fullPath).not.toContain('..');
    });

    it('should throw error for path traversal attempts', () => {
      expect(() => getSafePath('../../../etc/passwd')).toThrow(
        'Path traversal detected: ../../../etc/passwd'
      );
      expect(() => getSafePath('file/../../other.txt')).toThrow(
        'Path traversal detected: file/../../other.txt'
      );
    });

    it('should validate volume names', () => {
      expect(() => getSafePath('test.txt', 'reports:2024')).toThrow(
        'Invalid volume name: reports:2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
      expect(() => getSafePath('test.txt', 'reports*2024')).toThrow(
        'Invalid volume name: reports*2024. Volume must only contain alphanumeric characters, underscores, and forward slashes for path separators.'
      );
    });

    it('should handle nested volume paths', () => {
      const result = getSafePath('file.txt', 'reports/2024/january');

      expect(result.fullPath).toBe(join(DATA_PATH, 'reports', '2024', 'january', 'file.txt'));
      expect(result.alias).toBe('disk:data/reports/2024/january/file.txt');
    });

    it('should handle empty volume', () => {
      const result = getSafePath('test.txt', '');

      expect(result.fullPath).toBe(join(DATA_PATH, 'test.txt'));
      expect(result.alias).toBe('disk:data/test.txt');
    });

    it('should handle undefined volume', () => {
      const result = getSafePath('test.txt', undefined);

      expect(result.fullPath).toBe(join(DATA_PATH, 'test.txt'));
      expect(result.alias).toBe('disk:data/test.txt');
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      const testDir = join(DATA_PATH, 'test-ensure-dir');
      const testFile = join(testDir, 'subdir', 'file.txt');

      await ensureDirectory(testFile);

      // Check that the directory was created
      const fs = await import('fs');
      expect(fs.existsSync(join(testDir, 'subdir'))).toBe(true);

      // Clean up
      await fs.promises.rm(testDir, { recursive: true, force: true });
    });

    it('should not create directory if it already exists', async () => {
      const testDir = join(DATA_PATH, 'test-existing-dir');
      const testFile = join(testDir, 'file.txt');

      // Create directory first
      const fs = await import('fs');
      await fs.promises.mkdir(testDir, { recursive: true });

      // Ensure directory (should not throw)
      await ensureDirectory(testFile);

      // Clean up
      await fs.promises.rm(testDir, { recursive: true, force: true });
    });

    it('should handle nested directory creation', async () => {
      const testDir = join(DATA_PATH, 'test-nested-dir');
      const testFile = join(testDir, 'level1', 'level2', 'level3', 'file.txt');

      await ensureDirectory(testFile);

      // Check that all nested directories were created
      const fs = await import('fs');
      expect(fs.existsSync(join(testDir, 'level1'))).toBe(true);
      expect(fs.existsSync(join(testDir, 'level1', 'level2'))).toBe(true);
      expect(fs.existsSync(join(testDir, 'level1', 'level2', 'level3'))).toBe(true);

      // Clean up
      await fs.promises.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('ensureDirectorySync', () => {
    it('should create directory synchronously if it does not exist', async () => {
      const testDir = join(DATA_PATH, 'test-ensure-dir-sync');
      const testFile = join(testDir, 'subdir', 'file.txt');

      ensureDirectorySync(testFile);

      // Check that the directory was created
      const fs = await import('fs');
      expect(fs.existsSync(join(testDir, 'subdir'))).toBe(true);

      // Clean up
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should not create directory if it already exists', async () => {
      const testDir = join(DATA_PATH, 'test-existing-dir-sync');
      const testFile = join(testDir, 'file.txt');

      // Create directory first
      const fs = await import('fs');
      fs.mkdirSync(testDir, { recursive: true });

      // Ensure directory (should not throw)
      expect(() => ensureDirectorySync(testFile)).not.toThrow();

      // Clean up
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should handle nested directory creation synchronously', async () => {
      const testDir = join(DATA_PATH, 'test-nested-dir-sync');
      const testFile = join(testDir, 'level1', 'level2', 'level3', 'file.txt');

      ensureDirectorySync(testFile);

      // Check that all nested directories were created
      const fs = await import('fs');
      expect(fs.existsSync(join(testDir, 'level1'))).toBe(true);
      expect(fs.existsSync(join(testDir, 'level1', 'level2'))).toBe(true);
      expect(fs.existsSync(join(testDir, 'level1', 'level2', 'level3'))).toBe(true);

      // Clean up
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });
});
