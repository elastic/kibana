/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getSafePath, ensureDirectory, ensureDirectorySync } from './utils';

const DATA_PATH = join(REPO_ROOT, 'data');

describe('kbn-fs utils', () => {
  describe('getSafePath', () => {
    it('should create safe path without volume', () => {
      const result = getSafePath('test-file.txt');

      expect(result.fullPath).toBe(join(DATA_PATH, 'test-file.txt'));
      expect(result.alias).toBe('disk:data/test-file.txt');
    });

    it('should create safe path without volume with subfolder', () => {
      const result = getSafePath('test/test-file.txt');

      expect(result.fullPath).toBe(join(DATA_PATH, 'test/test-file.txt'));
      expect(result.alias).toBe('disk:data/test/test-file.txt');
    });

    it('should create safe path with volume', () => {
      const result = getSafePath('test-file.txt', 'reports');

      expect(result.fullPath).toBe(join(DATA_PATH, 'reports', 'test-file.txt'));
      expect(result.alias).toBe('disk:data/reports/test-file.txt');
    });

    it('should resolve absolute path', () => {
      const result = getSafePath('test.txt');

      expect(result.fullPath).toMatch(/^\/.*\/data\/test\.txt$/);
      expect(result.fullPath).not.toContain('..');
    });

    it('should throw error for path traversal attempts', () => {
      expect(() => getSafePath('../../../etc/passwd')).toThrow();
      expect(() => getSafePath('file/../../other.txt')).toThrow();
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
