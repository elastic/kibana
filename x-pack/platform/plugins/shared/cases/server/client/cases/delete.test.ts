/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MAX_DELETE_IDS_LENGTH, MAX_FILES_PER_CASE } from '../../../common/constants';
import type { FindFileArgs } from '@kbn/files-plugin/server';
import { createFileServiceMock } from '@kbn/files-plugin/server/mocks';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { CaseFileMetadataForDeletion } from '../../../common/files';
import { constructFileKindIdByOwner } from '../../../common/files';
import { getFileEntities, deleteCases } from './delete';
import { createCasesClientMockArgs } from '../mocks';
import { mockCases } from '../../mocks';

const getCaseIds = (numIds: number) => {
  return Array.from(Array(numIds).keys()).map((key) => key.toString());
};

describe('delete', () => {
  describe('getFileEntities', () => {
    const numCaseIds = 1000;
    const caseIds = getCaseIds(numCaseIds);
    const mockFileService = createFileServiceMock();
    mockFileService.find.mockImplementation(async (args: FindFileArgs) => {
      const caseMeta = args.meta as unknown as CaseFileMetadataForDeletion;
      const numFilesToGen = caseMeta.caseIds.length * MAX_FILES_PER_CASE;
      const files = Array.from(Array(numFilesToGen).keys()).map(() => createMockFileJSON());

      return {
        files,
        total: files.length,
      };
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('only provides 50 case ids in a single call to the find api', async () => {
      await getFileEntities(caseIds, mockFileService);

      for (const call of mockFileService.find.mock.calls) {
        const callMeta = call[0].meta as unknown as CaseFileMetadataForDeletion;
        expect(callMeta.caseIds.length).toEqual(50);
      }
    });

    it('calls the find function the number of case ids divided by the chunk size', async () => {
      await getFileEntities(caseIds, mockFileService);

      const chunkSize = 50;

      expect(mockFileService.find).toHaveBeenCalledTimes(numCaseIds / chunkSize);
    });

    it('returns the number of entities equal to the case ids times the max files per case limit', async () => {
      const expectedEntities = Array.from(Array(numCaseIds * MAX_FILES_PER_CASE).keys()).map(
        () => ({
          id: '123',
          owner: 'securitySolution',
        })
      );

      const entities = await getFileEntities(caseIds, mockFileService);

      expect(entities.length).toEqual(numCaseIds * MAX_FILES_PER_CASE);
      expect(entities).toEqual(expectedEntities);
    });
  });

  describe('deleteCases', () => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.fileService.find.mockResolvedValue({ files: [], total: 0 });

    clientArgs.services.caseService.getCases.mockResolvedValue({
      saved_objects: [mockCases[0], mockCases[1]],
    });

    clientArgs.services.attachmentService.getter.getAttachmentIdsForCases.mockResolvedValue([]);
    clientArgs.services.userActionService.getUserActionIdsForCases.mockResolvedValue([]);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('alerts', () => {
      const caseIds = ['mock-id-1', 'mock-id-2'];

      it('removes the case ids from all alerts', async () => {
        await deleteCases(caseIds, clientArgs);
        expect(clientArgs.services.alertsService.removeCaseIdsFromAllAlerts).toHaveBeenCalledWith({
          caseIds,
        });
      });
    });

    describe('errors', () => {
      it(`throws 400 when trying to delete more than ${MAX_DELETE_IDS_LENGTH} cases at a time`, async () => {
        const caseIds = new Array(MAX_DELETE_IDS_LENGTH + 1).fill('id');

        await expect(deleteCases(caseIds, clientArgs)).rejects.toThrowError(
          'Error: The length of the field ids is too long. Array must be of length <= 100.'
        );
      });

      it('throws 400 when no id is passed to delete', async () => {
        await expect(deleteCases([], clientArgs)).rejects.toThrowError(
          'Error: The length of the field ids is too short. Array must be of length >= 1.'
        );
      });
    });
  });
});

const createMockFileJSON = (): FileJSON => {
  return {
    id: '123',
    fileKind: constructFileKindIdByOwner('securitySolution'),
    meta: {
      owner: ['securitySolution'],
    },
  } as unknown as FileJSON;
};
