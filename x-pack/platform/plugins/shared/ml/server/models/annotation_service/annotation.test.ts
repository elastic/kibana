/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import getAnnotationsRequestMock from './__mocks__/get_annotations_request.json';
import getAnnotationsResponseMock from './__mocks__/get_annotations_response.json';

import { ANNOTATION_TYPE } from '../../../common/constants/annotations';
import type { Annotation } from '@kbn/ml-common-types/annotations';
import { isAnnotations } from '@kbn/ml-common-types/annotations';

import type { DeleteParams, GetResponse, IndexAnnotationArgs } from './annotation';
import { annotationServiceProvider } from '.';
import type { MlClient } from '../../lib/ml_client/types';

const acknowledgedResponseMock = { acknowledged: true };

const jobIdMock = 'job-id-mock';

describe('annotation_service', () => {
  let mlClusterClientSpy = {} as any;
  let mlClientSpy: Pick<MlClient, 'getJobs'>;
  let annotationService: ReturnType<typeof annotationServiceProvider>;
  let internalGetJobs: jest.Mock;

  beforeEach(() => {
    internalGetJobs = jest.fn().mockResolvedValue({ jobs: [{ job_id: jobIdMock }] });

    const callAs = {
      delete: jest.fn(() => Promise.resolve(acknowledgedResponseMock)),
      index: jest.fn(() => Promise.resolve(acknowledgedResponseMock)),
      search: jest.fn(() => Promise.resolve(getAnnotationsResponseMock)),
      ml: {
        getJobs: internalGetJobs,
      },
    };

    mlClusterClientSpy = {
      asCurrentUser: callAs,
      asInternalUser: callAs,
    };

    mlClientSpy = {
      getJobs: jest.fn().mockResolvedValue({ jobs: [{ job_id: jobIdMock }] }),
    };

    annotationService = annotationServiceProvider(mlClusterClientSpy, mlClientSpy as MlClient);
  });

  describe('deleteAnnotation()', () => {
    it('should delete annotation', async () => {
      const { deleteAnnotation } = annotationService;
      const mockFunct = mlClusterClientSpy;

      const annotationMockId = 'mockId';
      const deleteParamsMock: DeleteParams = {
        index: '.ml-annotations-000001',
        id: annotationMockId,
        refresh: 'wait_for',
      };

      const response = await deleteAnnotation(annotationMockId);

      expect(mockFunct.asInternalUser.delete.mock.calls[0][0]).toStrictEqual(deleteParamsMock);
      expect(response).toBe(acknowledgedResponseMock);
    });
  });

  describe('getAnnotation()', () => {
    it('should get annotations for specific job', async () => {
      const { getAnnotations } = annotationService;
      const mockFunct = mlClusterClientSpy;

      const indexAnnotationArgsMock: IndexAnnotationArgs = {
        jobIds: [jobIdMock],
        earliestMs: 1454804100000,
        latestMs: 1455233399999,
        maxAnnotations: 500,
      };

      const response: GetResponse = await getAnnotations(indexAnnotationArgsMock);

      expect(mockFunct.asInternalUser.search.mock.calls[0][0]).toStrictEqual(
        getAnnotationsRequestMock
      );
      expect(Object.keys(response.annotations)).toHaveLength(1);
      expect(response.annotations[jobIdMock]).toHaveLength(2);
      expect(isAnnotations(response.annotations[jobIdMock])).toBeTruthy();
    });

    it('should throw and catch an error', async () => {
      const mockEsError = {
        statusCode: 404,
        error: 'Not Found',
        message: 'mock error message',
      };

      const mlClusterClientSpyError: any = {
        asInternalUser: {
          search: jest.fn(() => Promise.resolve(mockEsError)),
          ml: {
            getJobs: internalGetJobs,
          },
        },
      };

      const { getAnnotations } = annotationServiceProvider(
        mlClusterClientSpyError,
        mlClientSpy as MlClient
      );

      const indexAnnotationArgsMock: IndexAnnotationArgs = {
        jobIds: [jobIdMock],
        earliestMs: 1454804100000,
        latestMs: 1455233399999,
        maxAnnotations: 500,
      };

      await expect(getAnnotations(indexAnnotationArgsMock)).rejects.toEqual(
        Error(`Annotations couldn't be retrieved from Elasticsearch.`)
      );
    });
  });

  describe('indexAnnotation()', () => {
    it('should index annotation', async () => {
      const { indexAnnotation } = annotationService;
      const mockFunct = mlClusterClientSpy;

      const annotationMock: Annotation = {
        annotation: 'Annotation text',
        job_id: jobIdMock,
        timestamp: 1454804100000,
        type: ANNOTATION_TYPE.ANNOTATION,
      };
      const usernameMock = 'usernameMock';

      const response = await indexAnnotation(annotationMock, usernameMock);

      // test if the annotation has been correctly augmented
      const indexParamsCheck = mockFunct.asInternalUser.index.mock.calls[0][0];
      const annotation = indexParamsCheck.body;
      expect(annotation.create_username).toBe(usernameMock);
      expect(annotation.modified_username).toBe(usernameMock);
      expect(typeof annotation.create_time).toBe('number');
      expect(typeof annotation.modified_time).toBe('number');

      expect(response).toBe(acknowledgedResponseMock);
    });

    it('should remove ._id and .key before updating annotation', async () => {
      const { indexAnnotation } = annotationService;
      const mockFunct = mlClusterClientSpy;

      const annotationMock: Annotation = {
        _id: 'mockId',
        annotation: 'Updated annotation text',
        job_id: jobIdMock,
        key: 'A',
        timestamp: 1454804100000,
        type: ANNOTATION_TYPE.ANNOTATION,
      };
      const usernameMock = 'usernameMock';

      const response = await indexAnnotation(annotationMock, usernameMock);

      // test if the annotation has been correctly augmented
      const indexParamsCheck = mockFunct.asInternalUser.index.mock.calls[0][0];
      const annotation = indexParamsCheck.body;
      expect(annotation.create_username).toBe(usernameMock);
      expect(annotation.modified_username).toBe(usernameMock);
      expect(typeof annotation.create_time).toBe('number');
      expect(typeof annotation.modified_time).toBe('number');
      expect(typeof annotation._id).toBe('undefined');
      expect(typeof annotation.key).toBe('undefined');

      expect(response).toBe(acknowledgedResponseMock);
    });

    it('should update annotation text and the username for modified_username', async () => {
      const { getAnnotations, indexAnnotation } = annotationService;
      const mockFunct = mlClusterClientSpy;

      const indexAnnotationArgsMock: IndexAnnotationArgs = {
        jobIds: [jobIdMock],
        earliestMs: 1454804100000,
        latestMs: 1455233399999,
        maxAnnotations: 500,
      };

      const response: GetResponse = await getAnnotations(indexAnnotationArgsMock);

      const annotation: Annotation = response.annotations[jobIdMock][0];

      const originalUsernameMock = 'usernameMock';
      expect(annotation.create_username).toBe(originalUsernameMock);
      expect(annotation.modified_username).toBe(originalUsernameMock);

      const modifiedAnnotationText = 'Modified Annotation 1';
      annotation.annotation = modifiedAnnotationText;

      const modifiedUsernameMock = 'modifiedUsernameMock';

      await indexAnnotation(annotation, modifiedUsernameMock);

      // test if the annotation has been correctly updated
      const indexParamsCheck = mockFunct.asInternalUser.index.mock.calls[0][0];
      const modifiedAnnotation = indexParamsCheck.body;
      expect(modifiedAnnotation.annotation).toBe(modifiedAnnotationText);
      expect(modifiedAnnotation.create_username).toBe(originalUsernameMock);
      expect(modifiedAnnotation.modified_username).toBe(modifiedUsernameMock);
      expect(typeof modifiedAnnotation.create_time).toBe('number');
      expect(typeof modifiedAnnotation.modified_time).toBe('number');
    });
  });

  describe('checkJobAccess()', () => {
    const indexAnnotationArgs = (jobIds: string[]): IndexAnnotationArgs => ({
      jobIds,
      earliestMs: 1454804100000,
      latestMs: 1455233399999,
      maxAnnotations: 500,
    });

    it('should deny access when the job exists but is inaccessible to the user', async () => {
      const accessError = Object.assign(new Error('job not found in space'), { statusCode: 404 });
      (mlClientSpy.getJobs as jest.Mock).mockRejectedValue(accessError);
      internalGetJobs.mockResolvedValue({ jobs: [{ job_id: jobIdMock }] });

      await expect(annotationService.getAnnotations(indexAnnotationArgs([jobIdMock]))).rejects.toBe(
        accessError
      );
      expect(internalGetJobs).toHaveBeenCalledWith({ job_id: jobIdMock });
    });

    it('should allow access when the job is missing for both the user and internal client', async () => {
      const notFoundError = Object.assign(new Error('job not found'), { statusCode: 404 });
      (mlClientSpy.getJobs as jest.Mock).mockRejectedValue(notFoundError);
      internalGetJobs.mockRejectedValue(notFoundError);

      const response = await annotationService.getAnnotations(indexAnnotationArgs([jobIdMock]));

      expect(response.success).toBe(true);
      expect(internalGetJobs).toHaveBeenCalledWith({ job_id: jobIdMock });
    });

    it('should fail closed when the internal existence probe returns a non-404 error', async () => {
      const accessError = Object.assign(new Error('job not found in space'), { statusCode: 404 });
      const serviceUnavailable = Object.assign(new Error('service unavailable'), {
        statusCode: 503,
      });
      (mlClientSpy.getJobs as jest.Mock).mockRejectedValue(accessError);
      internalGetJobs.mockRejectedValue(serviceUnavailable);

      await expect(annotationService.getAnnotations(indexAnnotationArgs([jobIdMock]))).rejects.toBe(
        serviceUnavailable
      );
    });

    it('should reject an empty job ID list', async () => {
      await expect(annotationService.getAnnotations(indexAnnotationArgs([]))).rejects.toMatchObject(
        {
          isBoom: true,
          output: { statusCode: 400, payload: { message: 'No valid job IDs provided' } },
        }
      );
      expect(mlClientSpy.getJobs).not.toHaveBeenCalled();
    });

    it('should reject invalid job IDs', async () => {
      await expect(
        annotationService.getAnnotations(indexAnnotationArgs(['job-*']))
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 400, payload: { message: 'No valid job IDs provided' } },
      });
      expect(mlClientSpy.getJobs).not.toHaveBeenCalled();
    });

    it('should deny access to an inaccessible job even when paired with a missing job ID', async () => {
      const victimJobId = 'victim-job';
      const missingJobId = 'does-not-exist';
      const accessError = Object.assign(new Error('job not found in space'), { statusCode: 404 });
      const notFoundError = Object.assign(new Error('job not found'), { statusCode: 404 });

      (mlClientSpy.getJobs as jest.Mock).mockImplementation(({ job_id: jobId }) => {
        if (jobId === victimJobId || jobId === missingJobId) {
          return Promise.reject(accessError);
        }
        return Promise.resolve({ jobs: [{ job_id: jobId }] });
      });

      internalGetJobs.mockImplementation(({ job_id: jobId }) => {
        if (jobId === victimJobId) {
          return Promise.resolve({ jobs: [{ job_id: jobId }] });
        }
        return Promise.reject(notFoundError);
      });

      await expect(
        annotationService.getAnnotations(indexAnnotationArgs([missingJobId, victimJobId]))
      ).rejects.toBe(accessError);
    });

    it('should reject invalid job IDs when indexing', async () => {
      const annotationMock: Annotation = {
        annotation: 'Annotation text',
        job_id: 'Invalid_Job?',
        timestamp: 1454804100000,
        type: ANNOTATION_TYPE.ANNOTATION,
      };

      await expect(
        annotationService.indexAnnotation(annotationMock, 'usernameMock')
      ).rejects.toThrow(Boom.badRequest('No valid job IDs provided'));
      expect(mlClientSpy.getJobs).not.toHaveBeenCalled();
    });
  });
});
