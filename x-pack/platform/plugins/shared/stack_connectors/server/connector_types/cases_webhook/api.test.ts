/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { externalServiceMock, apiParams } from './mock';
import { ExternalService } from './types';
import { api } from './api';
let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  describe('create incident - cases', () => {
    test('it creates an incident', async () => {
      const params = { ...apiParams, externalId: null };
      const res = await api.pushToService({
        externalService,
        params,
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://coolsite.net/browse/CK-1',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-04-27T10:59:46.202Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-04-27T10:59:46.202Z',
          },
        ],
      });
    });

    test('it creates an incident without comments', async () => {
      const params = { ...apiParams, externalId: null, comments: [] };
      const res = await api.pushToService({
        externalService,
        params,
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://coolsite.net/browse/CK-1',
      });
    });

    test('it calls createIncident correctly', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.createIncident).toHaveBeenCalledWith({
        incident: {
          tags: ['kibana', 'elastic'],
          description: 'Incident description',
          id: '10006',
          severity: 'High',
          status: 'Open',
          title: 'Incident title',
        },
      });
      expect(externalService.updateIncident).not.toHaveBeenCalled();
    });

    test('it calls createComment correctly', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });
    });
  });

  describe('update incident', () => {
    test('it updates an incident', async () => {
      const res = await api.pushToService({
        externalService,
        params: apiParams,
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://coolsite.net/browse/CK-1',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-04-27T10:59:46.202Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-04-27T10:59:46.202Z',
          },
        ],
      });
    });

    test('it updates an incident without comments', async () => {
      const params = { ...apiParams, comments: [] };
      const res = await api.pushToService({
        externalService,
        params,
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'CK-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://coolsite.net/browse/CK-1',
      });
    });

    test('it calls updateIncident correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.updateIncident).toHaveBeenCalledWith({
        incidentId: 'incident-3',
        incident: {
          tags: ['kibana', 'elastic'],
          description: 'Incident description',
          id: '10006',
          severity: 'High',
          status: 'Open',
          title: 'Incident title',
        },
      });
      expect(externalService.createIncident).not.toHaveBeenCalled();
    });

    test('it calls updateIncident correctly without mapping', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });

      expect(externalService.updateIncident).toHaveBeenCalledWith({
        incidentId: 'incident-3',
        incident: {
          description: 'Incident description',
          id: '10006',
          severity: 'High',
          status: 'Open',
          title: 'Incident title',
          tags: ['kibana', 'elastic'],
        },
      });
      expect(externalService.createIncident).not.toHaveBeenCalled();
    });

    test('it calls createComment correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });
    });

    test('it calls createComment correctly without mapping', async () => {
      const params = { ...apiParams };
      await api.pushToService({ externalService, params, logger: mockedLogger });
      expect(externalService.createComment).toHaveBeenCalledTimes(2);
      expect(externalService.createComment).toHaveBeenNthCalledWith(1, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-1',
          comment: 'A comment',
        },
      });

      expect(externalService.createComment).toHaveBeenNthCalledWith(2, {
        incidentId: 'incident-1',
        comment: {
          commentId: 'case-comment-2',
          comment: 'Another comment',
        },
      });
    });
  });
});
