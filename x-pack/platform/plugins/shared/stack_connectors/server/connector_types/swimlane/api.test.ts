/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { api } from './api';
import { ExternalService } from './types';
import {
  apiParams,
  externalServiceMock,
  recordResponseCreate,
  recordResponseUpdate,
} from './mocks';
import { Logger } from '@kbn/logging';

let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  describe('pushToService', () => {
    test('it pushes a new record', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      const res = await api.pushToService({
        externalService,
        logger: mockedLogger,
        params,
      });

      expect(externalService.createComment).toHaveBeenCalled();
      expect(externalService.createRecord).toHaveBeenCalled();
      expect(externalService.updateRecord).not.toHaveBeenCalled();

      expect(res).toEqual({
        ...recordResponseCreate,
        comments: [
          {
            commentId: '123456',
            pushedDate: '2021-06-01T17:29:51.092Z',
          },
          {
            commentId: '123456',
            pushedDate: '2021-06-01T17:29:51.092Z',
          },
        ],
      });
    });

    test('it pushes a new record without comment', async () => {
      const params = {
        ...apiParams,
        incident: { ...apiParams.incident, externalId: null },
        comments: [],
      };
      const res = await api.pushToService({
        externalService,
        logger: mockedLogger,
        params,
      });

      expect(externalService.createComment).not.toHaveBeenCalled();
      expect(externalService.createRecord).toHaveBeenCalled();
      expect(res).toEqual(recordResponseCreate);
    });

    test('updates existing record', async () => {
      const res = await api.pushToService({
        externalService,
        logger: mockedLogger,
        params: apiParams,
      });

      expect(externalService.createComment).toHaveBeenCalled();
      expect(externalService.createRecord).not.toHaveBeenCalled();
      expect(externalService.updateRecord).toHaveBeenCalled();
      expect(res).toEqual({
        ...recordResponseUpdate,
        comments: [
          {
            commentId: '123456',
            pushedDate: '2021-06-01T17:29:51.092Z',
          },
          {
            commentId: '123456',
            pushedDate: '2021-06-01T17:29:51.092Z',
          },
        ],
      });
    });

    test('it calls createRecord correctly', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.createRecord).toHaveBeenCalledWith({
        incident: {
          alertId: '123456',
          caseId: '123456',
          caseName: 'case name',
          description: 'case desc',
          ruleName: 'rule name',
          severity: 'critical',
        },
      });
    });

    test('it calls createComment correctly', async () => {
      const mockedToISOString = jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2021-06-15T18:02:29.404Z');

      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        createdDate: '2021-06-15T18:02:29.404Z',
        incidentId: '123456',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        createdDate: '2021-06-15T18:02:29.404Z',
        incidentId: '123456',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });

      mockedToISOString.mockRestore();
    });
  });
});
