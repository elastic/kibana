/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { Repository, EmptyRepository } from '../../../../common/types';
import { textService } from '../text';
import { validateRepository, INVALID_NAME_CHARS } from './validate_repository';

textService.setup(i18n);

/**
 * Helper to build test repository objects that intentionally omit required
 * settings fields (e.g. testing validation of missing location/bucket).
 * The production types are strict unions, but the validator handles missing
 * fields at runtime — that is exactly what we are testing.
 */
const repo = (overrides: Record<string, unknown>) =>
  overrides as unknown as Repository | EmptyRepository;

describe('validateRepository', () => {
  describe('WHEN name is empty', () => {
    it('SHOULD return a name-required error', () => {
      const result = validateRepository({ name: '', type: 'fs', settings: { location: '/tmp' } });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toEqual(['Repository name is required.']);
    });
  });

  describe('WHEN name is whitespace only', () => {
    it('SHOULD return a name-required error', () => {
      const result = validateRepository({
        name: '   ',
        type: 'fs',
        settings: { location: '/tmp' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toEqual(['Spaces are not allowed in the name.']);
    });
  });

  describe('WHEN name contains spaces', () => {
    it('SHOULD return a spaces-not-allowed error', () => {
      const result = validateRepository({
        name: 'with space',
        type: 'fs',
        settings: { location: '/tmp' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toEqual(['Spaces are not allowed in the name.']);
    });
  });

  describe('WHEN name contains invalid characters', () => {
    it.each(INVALID_NAME_CHARS)('SHOULD return an invalid-character error for "%s"', (char) => {
      const result = validateRepository({
        name: `with${char}`,
        type: 'fs',
        settings: { location: '/tmp' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toEqual([`Character "${char}" is not allowed in the name.`]);
    });
  });

  describe('WHEN type is empty', () => {
    it('SHOULD return a type-required error', () => {
      const result = validateRepository({ name: 'my-repo', type: null, settings: {} }, false);

      expect(result.isValid).toBe(false);
      expect(result.errors.type).toEqual(['Type is required.']);
    });
  });

  describe('WHEN type is source but delegateType is empty', () => {
    it('SHOULD return a type-required error', () => {
      const result = validateRepository(
        repo({ name: 'my-repo', type: 'source', settings: { delegateType: null } }),
        false
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.type).toEqual(['Type is required.']);
    });
  });

  describe('WHEN a valid repository is provided', () => {
    it('SHOULD return isValid true', () => {
      const result = validateRepository({
        name: 'my-repo',
        type: 'fs',
        settings: { location: '/tmp/backups' },
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('settings validation', () => {
    describe('WHEN fs repository has empty location', () => {
      it('SHOULD return a location-required error', () => {
        const result = validateRepository(repo({ name: 'my-repo', type: 'fs', settings: {} }));

        expect(result.isValid).toBe(false);
        expect(result.errors.settings).toEqual({
          location: ['Location is required.'],
        });
      });
    });

    describe('WHEN url repository has empty url', () => {
      it('SHOULD return a url-required error', () => {
        const result = validateRepository(repo({ name: 'my-repo', type: 'url', settings: {} }));

        expect(result.isValid).toBe(false);
        expect(result.errors.settings).toEqual({
          url: ['URL is required.'],
        });
      });
    });

    describe('WHEN s3 repository has empty bucket', () => {
      it('SHOULD return a bucket-required error', () => {
        const result = validateRepository(repo({ name: 'my-repo', type: 's3', settings: {} }));

        expect(result.isValid).toBe(false);
        expect(result.errors.settings).toEqual({
          bucket: ['Bucket is required.'],
        });
      });
    });

    describe('WHEN gcs repository has empty bucket', () => {
      it('SHOULD return a bucket-required error', () => {
        const result = validateRepository(repo({ name: 'my-repo', type: 'gcs', settings: {} }));

        expect(result.isValid).toBe(false);
        expect(result.errors.settings).toEqual({
          bucket: ['Bucket is required.'],
        });
      });
    });

    describe('WHEN hdfs repository has empty uri and path', () => {
      it('SHOULD return uri-required and path-required errors', () => {
        const result = validateRepository(repo({ name: 'my-repo', type: 'hdfs', settings: {} }));

        expect(result.isValid).toBe(false);
        expect(result.errors.settings).toEqual({
          uri: ['URI is required.'],
          path: ['Path is required.'],
        });
      });
    });

    describe('WHEN azure repository has no required settings', () => {
      it('SHOULD not produce settings errors', () => {
        const result = validateRepository(repo({ name: 'my-repo', type: 'azure', settings: {} }));

        expect(result.isValid).toBe(true);
        expect(result.errors.settings).toBeUndefined();
      });
    });

    describe('WHEN source repository delegates to fs with empty location', () => {
      it('SHOULD return the delegate type settings errors', () => {
        const result = validateRepository(
          repo({ name: 'my-repo', type: 'source', settings: { delegateType: 'fs' } })
        );

        expect(result.isValid).toBe(false);
        expect(result.errors.settings).toEqual({
          location: ['Location is required.'],
        });
      });
    });

    describe('WHEN validateSettings is false', () => {
      it('SHOULD skip settings validation', () => {
        const result = validateRepository(
          repo({ name: 'my-repo', type: 'fs', settings: {} }),
          false
        );

        expect(result.isValid).toBe(true);
        expect(result.errors.settings).toBeUndefined();
      });
    });
  });
});
