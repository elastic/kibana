/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getIssueTypes, getFieldsByIssueType, getIssues, getIssue } from './api';

const issueTypesResponse = {
  data: {
    projects: [
      {
        issuetypes: [
          {
            id: '10006',
            name: 'Task',
          },
          {
            id: '10007',
            name: 'Bug',
          },
        ],
      },
    ],
  },
};

const fieldsResponse = {
  data: {
    projects: [
      {
        issuetypes: [
          {
            id: '10006',
            name: 'Task',
            fields: {
              summary: { fieldId: 'summary' },
              priority: {
                fieldId: 'priority',
                allowedValues: [
                  {
                    name: 'Highest',
                    id: '1',
                  },
                  {
                    name: 'High',
                    id: '2',
                  },
                  {
                    name: 'Medium',
                    id: '3',
                  },
                  {
                    name: 'Low',
                    id: '4',
                  },
                  {
                    name: 'Lowest',
                    id: '5',
                  },
                ],
                defaultValue: {
                  name: 'Medium',
                  id: '3',
                },
              },
            },
          },
        ],
      },
    ],
  },
};

const issue = {
  id: '10267',
  key: 'RJ-107',
  title: 'test title',
};

const issueResponse = {
  status: 'ok' as const,
  connector_id: '1',
  data: issue,
};

const issuesResponse = {
  ...issueResponse,
  data: [issue],
};

const camelCasedIssueResponse = {
  status: 'ok' as const,
  actionId: '1',
  data: issue,
};

const camelCasedIssuesResponse = {
  ...camelCasedIssueResponse,
  data: [issue],
};

describe('Jira API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());

  describe('getIssueTypes', () => {
    test('should call get issue types API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(issueTypesResponse);
      const res = await getIssueTypes({ http, signal: abortCtrl.signal, connectorId: 'test' });

      expect(res).toEqual(issueTypesResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/test/_execute', {
        body: '{"params":{"subAction":"issueTypes","subActionParams":{}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getFieldsByIssueType', () => {
    test('should call get fields API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(fieldsResponse);
      const res = await getFieldsByIssueType({
        http,
        signal: abortCtrl.signal,
        connectorId: 'test',
        id: '10006',
      });

      expect(res).toEqual(fieldsResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/test/_execute', {
        body: '{"params":{"subAction":"fieldsByIssueType","subActionParams":{"id":"10006"}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getIssues', () => {
    test('should call get fields API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(issuesResponse);
      const res = await getIssues({
        http,
        signal: abortCtrl.signal,
        connectorId: 'test',
        title: 'test issue',
      });

      expect(res).toEqual(camelCasedIssuesResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/test/_execute', {
        body: '{"params":{"subAction":"issues","subActionParams":{"title":"test issue"}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getIssue', () => {
    test('should call get fields API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(issueResponse);
      const res = await getIssue({
        http,
        signal: abortCtrl.signal,
        connectorId: 'test',
        id: 'RJ-107',
      });

      expect(res).toEqual(camelCasedIssueResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/test/_execute', {
        body: '{"params":{"subAction":"issue","subActionParams":{"id":"RJ-107"}}}',
        signal: abortCtrl.signal,
      });
    });
  });
});
