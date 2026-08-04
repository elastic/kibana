/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDirectoryListingQuery,
  buildRootDiscoveryQuery,
  resolveHostOsFamily,
} from './file_system_queries';

describe('file_system_queries', () => {
  describe('buildDirectoryListingQuery', () => {
    it('should build a one-level listing query with an escaped path', () => {
      expect(buildDirectoryListingQuery('/etc')).toBe(
        "SELECT path, filename, size, mtime, type FROM file WHERE directory = '/etc'"
      );
    });

    it('should escape a path containing a single quote', () => {
      expect(buildDirectoryListingQuery("/etc/o'reilly")).toBe(
        "SELECT path, filename, size, mtime, type FROM file WHERE directory = '/etc/o''reilly'"
      );
    });

    it('should neutralize an injection attempt at the query boundary', () => {
      const query = buildDirectoryListingQuery("/tmp'; DROP TABLE file; --");
      expect(query).toBe(
        "SELECT path, filename, size, mtime, type FROM file WHERE directory = '/tmp''; DROP TABLE file; --'"
      );
      // No trailing `%%` recursion — strictly one level.
      expect(query).not.toContain('%%');
    });
  });

  describe('buildRootDiscoveryQuery', () => {
    it('should use logical_drives on Windows', () => {
      expect(buildRootDiscoveryQuery('windows')).toBe(
        'SELECT device_id AS path FROM logical_drives'
      );
    });

    it('should use mounts on Linux', () => {
      expect(buildRootDiscoveryQuery('linux')).toBe('SELECT path FROM mounts');
    });

    it('should use mounts on macOS', () => {
      expect(buildRootDiscoveryQuery('darwin')).toBe('SELECT path FROM mounts');
    });
  });

  describe('resolveHostOsFamily', () => {
    it.each([
      ['windows', 'windows'],
      ['Windows', 'windows'],
      ['darwin', 'darwin'],
      ['macOS', 'darwin'],
      ['Mac OS X', 'darwin'],
      ['linux', 'linux'],
      ['Ubuntu', 'linux'],
      [undefined, 'linux'],
      ['', 'linux'],
    ])('should resolve %s to %s', (input, expected) => {
      expect(resolveHostOsFamily(input)).toBe(expected);
    });
  });
});
