/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { File } from '@kbn/files-plugin/common';
import { createFileServiceMock } from '@kbn/files-plugin/server/mocks';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common';
import { constructFileKindIdByOwner } from '../../../common/files';
import {
  createFileEntities,
  deleteFiles,
  getFileEntitiesForCase,
  retrieveFilesIgnoringNotFound,
} from '.';

describe('server files', () => {
  describe('createFileEntities', () => {
    it('returns an empty array when passed no files', () => {
      expect(createFileEntities([])).toEqual([]);
    });

    it('throws an error when the file kind is not valid', () => {
      expect.assertions(1);

      expect(() =>
        createFileEntities([{ fileKind: 'abc', id: '1' }])
      ).toThrowErrorMatchingInlineSnapshot(`"File id 1 has invalid file kind abc"`);
    });

    it('throws an error when one of the file entities does not have a valid file kind', () => {
      expect.assertions(1);

      expect(() =>
        createFileEntities([
          { fileKind: constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER), id: '1' },
          { fileKind: 'abc', id: '2' },
        ])
      ).toThrowErrorMatchingInlineSnapshot(`"File id 2 has invalid file kind abc"`);
    });

    it('returns an array of entities when the file kind is valid', () => {
      expect.assertions(1);

      expect(
        createFileEntities([
          { fileKind: constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER), id: '1' },
          { fileKind: constructFileKindIdByOwner(OBSERVABILITY_OWNER), id: '2' },
        ])
      ).toEqual([
        { id: '1', owner: 'securitySolution' },
        { id: '2', owner: 'observability' },
      ]);
    });
  });

  describe('deleteFiles', () => {
    it('does not call delete when the file ids is empty', async () => {
      const fileServiceMock = createFileServiceMock();

      expect.assertions(1);
      await deleteFiles([], fileServiceMock);

      expect(fileServiceMock.delete).not.toHaveBeenCalled();
    });

    it('calls delete twice with the ids passed in', async () => {
      const fileServiceMock = createFileServiceMock();

      expect.assertions(2);
      await deleteFiles(['1', '2'], fileServiceMock);

      expect(fileServiceMock.delete).toHaveBeenCalledTimes(2);
      expect(fileServiceMock.delete.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "id": "1",
            },
          ],
          Array [
            Object {
              "id": "2",
            },
          ],
        ]
      `);
    });
  });

  describe('getFileEntitiesForCase', () => {
    const logger = loggerMock.create();
    const fileService = createFileServiceMock();

    const createCaseFile = (id: string, caseIds: string[]) =>
      ({
        id,
        data: {
          id,
          fileKind: constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER),
          meta: { caseIds, owner: [SECURITY_SOLUTION_OWNER] },
        },
      } as unknown as File);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not look up any file when passed no ids', async () => {
      await expect(
        getFileEntitiesForCase({ caseId: 'case-1', fileIds: [], fileService, logger })
      ).resolves.toEqual([]);

      expect(fileService.getById).not.toHaveBeenCalled();
    });

    it('returns the entities of the files that belong only to the case', async () => {
      fileService.getById.mockResolvedValue(createCaseFile('file-1', ['case-1']));

      await expect(
        getFileEntitiesForCase({ caseId: 'case-1', fileIds: ['file-1'], fileService, logger })
      ).resolves.toEqual([{ id: 'file-1', owner: SECURITY_SOLUTION_OWNER }]);
    });

    it('skips files that no longer exist', async () => {
      fileService.getById.mockRejectedValue(new FileNotFoundError('not found'));

      await expect(
        getFileEntitiesForCase({ caseId: 'case-1', fileIds: ['file-1'], fileService, logger })
      ).resolves.toEqual([]);
    });

    it('rejects a file linked to another case', async () => {
      fileService.getById.mockResolvedValue(createCaseFile('file-1', ['case-1', 'case-2']));

      await expect(
        getFileEntitiesForCase({ caseId: 'case-1', fileIds: ['file-1'], fileService, logger })
      ).rejects.toThrow('Failed to delete files because file ids were invalid: file-1');
    });

    describe('when skipping invalid files', () => {
      const getEntities = () =>
        getFileEntitiesForCase({
          caseId: 'case-1',
          fileIds: ['file-1', 'file-2'],
          fileService,
          logger,
          skipInvalid: true,
        });

      it.each([
        ['linked to another case', { meta: { caseIds: ['case-1', 'case-2'] } }],
        ['with invalid metadata', { meta: { caseIds: 'case-1' } }],
        ['with an invalid file kind', { fileKind: 'abc' }],
      ])('leaves out a file %s and logs it', async (_, data) => {
        const invalidFile = createCaseFile('file-1', ['case-1']);
        fileService.getById
          .mockResolvedValueOnce({ ...invalidFile, data: { ...invalidFile.data, ...data } } as File)
          .mockResolvedValueOnce(createCaseFile('file-2', ['case-1']));

        await expect(getEntities()).resolves.toEqual([
          { id: 'file-2', owner: SECURITY_SOLUTION_OWNER },
        ]);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('file-1'));
      });
    });
  });

  describe('retrieveFilesIgnoringNotFound', () => {
    const mockLogger = loggerMock.create();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns an empty array when the results is an empty array', () => {
      expect(retrieveFilesIgnoringNotFound([], [], mockLogger)).toEqual([]);
    });

    it('returns a fulfilled file', async () => {
      expect(retrieveFilesIgnoringNotFound([createFakeFile()], ['abc'], mockLogger)).toEqual([{}]);
    });

    it('logs a warning when encountering a file not found error', async () => {
      const fileNotFound = new FileNotFoundError('not found');

      expect(retrieveFilesIgnoringNotFound([fileNotFound], ['abc'], mockLogger)).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to find file id: abc: Error: not found",
        ]
      `);
    });

    it('logs a warning without the fileId when the results length is different from the file ids', async () => {
      const fileNotFound = new FileNotFoundError('not found');

      expect(retrieveFilesIgnoringNotFound([fileNotFound], ['abc', '123'], mockLogger)).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to find file: Error: not found",
        ]
      `);
    });

    it('throws when encountering an error that is not a file not found', async () => {
      const otherError = new Error('other error');

      expect.assertions(2);

      expect(() => retrieveFilesIgnoringNotFound([otherError], ['abc'], mockLogger)).toThrow(
        otherError
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('throws when encountering an error that is not a file not found after a valid file', async () => {
      const otherError = new Error('other error');
      const fileResult = createFakeFile();

      expect.assertions(2);

      expect(() =>
        retrieveFilesIgnoringNotFound([fileResult, otherError], ['1', '2'], mockLogger)
      ).toThrow(otherError);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});

const createFakeFile = () => {
  return {} as File;
};
