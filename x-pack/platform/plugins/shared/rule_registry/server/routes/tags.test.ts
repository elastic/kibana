/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { bulkPatchAlertTagsRoute } from './tags';
import { requestContextMock } from './__mocks__/request_context';
import { requestMock, serverMock } from './__mocks__/server';

const getPatchTagsByAlertIdsRequest = () =>
  requestMock.create({
    method: 'patch',
    path: `${BASE_RAC_ALERTS_API_PATH}/tags`,
    body: {
      alertIds: ['alert-1'],
      index: '.alerts-security.alerts',
      addTags: ['new-tag'],
    },
  });

const getPatchTagsByQueryRequest = () =>
  requestMock.create({
    method: 'patch',
    path: `${BASE_RAC_ALERTS_API_PATH}/tags`,
    body: {
      query: { term: { 'some.field': 'some-value' } },
      index: '.alerts-security.alerts',
      addTags: ['tag-to-add'],
      removeTags: ['tag-to-remove'],
    },
  });

describe('bulkPatchAlertTagsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.patchTags.mockResolvedValue({
      failures: [],
      updated: 1,
    });

    bulkPatchAlertTagsRoute(server.router);
  });

  describe('success scenarios', () => {
    test('returns 200 when updating tags by query', async () => {
      clients.rac.patchTags.mockResolvedValue({
        failures: [],
        updated: 5,
      });
      const response = await server.inject(getPatchTagsByQueryRequest(), context);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        success: true,
        failures: [],
        updated: 5,
      });
      expect(clients.rac.patchTags).toHaveBeenCalledWith({
        query: { term: { 'some.field': 'some-value' } },
        index: '.alerts-security.alerts',
        addTags: ['tag-to-add'],
        removeTags: ['tag-to-remove'],
        alertIds: undefined,
      });
    });
  });

  describe('failure scenarios', () => {
    test('returns 400 if alertIds array is too large', async () => {
      const largeAlertIds = Array.from({ length: 1001 }, (_, i) => `alert-${i}`);
      const request = requestMock.create({
        method: 'patch',
        path: `${BASE_RAC_ALERTS_API_PATH}/tags`,
        body: {
          alertIds: largeAlertIds,
          index: '.alerts-security.alerts',
          addTags: ['some-tag'],
        },
      });
      const response = await server.inject(request, context);
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: 'cannot use more than 1000 ids',
      });
    });

    test('returns 500 if rac client "patchTags" fails', async () => {
      clients.rac.patchTags.mockRejectedValue(new Error('Unable to patch tags'));
      const response = await server.inject(getPatchTagsByAlertIdsRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: { success: false },
        message: 'Unable to patch tags',
      });
    });
  });

  describe('request validation', () => {
    test('rejects if index is missing', async () => {
      const request = {
        ...getPatchTagsByAlertIdsRequest(),
        body: {
          alertIds: ['alert-1'],
          addTags: ['new-tag'],
        },
      };
      await expect(server.inject(request, context)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"index\\"'"`
      );
    });

    test('rejects if both alertIds and query are provided', async () => {
      const request = {
        ...getPatchTagsByAlertIdsRequest(),
        body: {
          alertIds: ['alert-1'],
          query: { term: { 'some.field': 'some-value' } },
          index: '.alerts-security.alerts',
          addTags: ['new-tag'],
        },
      };
      await expect(server.inject(request, context)).rejects.toThrowError();
    });

    test('rejects if neither alertIds nor query are provided', async () => {
      const request = {
        ...getPatchTagsByAlertIdsRequest(),
        body: {
          index: '.alerts-security.alerts',
          addTags: ['new-tag'],
        },
      };
      await expect(server.inject(request, context)).rejects.toThrowError();
    });
  });
});
