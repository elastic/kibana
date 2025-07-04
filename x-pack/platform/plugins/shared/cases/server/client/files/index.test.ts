/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFileServiceMock } from '@kbn/files-plugin/server/mocks';
import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common';
import { constructFileKindIdByOwner } from '../../../common/files';
import { createFileEntities, deleteFiles } from '.';

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

      expect(fileServiceMock.delete).not.toBeCalled();
    });

    it('calls delete twice with the ids passed in', async () => {
      const fileServiceMock = createFileServiceMock();

      expect.assertions(2);
      await deleteFiles(['1', '2'], fileServiceMock);

      expect(fileServiceMock.delete).toBeCalledTimes(2);
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
});
