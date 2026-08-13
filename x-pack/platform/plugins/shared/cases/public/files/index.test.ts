/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FILE_SIZE, MAX_IMAGE_FILE_SIZE } from '../../common/constants';
import { createMockFilesSetup } from '@kbn/files-plugin/public/mocks';
import { registerCaseFileKinds } from '.';
import type { FilesConfig } from './types';

const resolveMaxSizeBytes = (
  maxSizeBytes: number | ((file: File) => number) | undefined,
  file: File
): number | undefined => (typeof maxSizeBytes === 'function' ? maxSizeBytes(file) : maxSizeBytes);

const asFile = (type: string): File => ({ type } as File);

describe('ui files index', () => {
  describe('registerCaseFileKinds', () => {
    const mockFilesSetup = createMockFilesSetup();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('allowedMimeTypes', () => {
      const config: FilesConfig = {
        allowedMimeTypes: ['abc'],
        maxSize: undefined,
      };

      beforeEach(() => {
        registerCaseFileKinds(config, mockFilesSetup);
      });

      it('sets cases allowed mime types to abc', () => {
        expect(mockFilesSetup.registerFileKind.mock.calls[0][0].allowedMimeTypes).toEqual(['abc']);
      });

      it('sets observability allowed mime types to abc', () => {
        expect(mockFilesSetup.registerFileKind.mock.calls[1][0].allowedMimeTypes).toEqual(['abc']);
      });

      it('sets securitySolution allowed mime types to 100 mb', () => {
        expect(mockFilesSetup.registerFileKind.mock.calls[2][0].allowedMimeTypes).toEqual(['abc']);
      });
    });

    describe('max file size', () => {
      describe('default max file size', () => {
        const config: FilesConfig = {
          allowedMimeTypes: ['image/png'],
          maxSize: undefined,
        };

        beforeEach(() => {
          registerCaseFileKinds(config, mockFilesSetup);
        });

        it.each([
          ['cases', 0],
          ['observability', 1],
          ['securitySolution', 2],
        ])('sets %s non-image max file size to 100 mb', (_owner, index) => {
          const { maxSizeBytes } = mockFilesSetup.registerFileKind.mock.calls[index][0];
          expect(resolveMaxSizeBytes(maxSizeBytes, asFile('text/plain'))).toEqual(MAX_FILE_SIZE);
        });

        it.each([
          ['cases', 0],
          ['observability', 1],
          ['securitySolution', 2],
        ])('sets %s image max file size to 10 mb', (_owner, index) => {
          const { maxSizeBytes } = mockFilesSetup.registerFileKind.mock.calls[index][0];
          expect(resolveMaxSizeBytes(maxSizeBytes, asFile('image/png'))).toEqual(
            MAX_IMAGE_FILE_SIZE
          );
        });
      });

      describe('custom file size', () => {
        const config: FilesConfig = {
          allowedMimeTypes: ['image/png'],
          maxSize: 5,
        };

        beforeEach(() => {
          registerCaseFileKinds(config, mockFilesSetup);
        });

        it.each([
          ['cases', 0],
          ['observability', 1],
          ['securitySolution', 2],
        ])('sets %s max file size to the configured value for any file type', (_owner, index) => {
          const { maxSizeBytes } = mockFilesSetup.registerFileKind.mock.calls[index][0];
          expect(resolveMaxSizeBytes(maxSizeBytes, asFile('text/plain'))).toEqual(5);
          expect(resolveMaxSizeBytes(maxSizeBytes, asFile('image/png'))).toEqual(5);
        });
      });
    });
  });
});
