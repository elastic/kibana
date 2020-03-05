/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import {
  getEmptyFindResult,
  getFindResultStatus,
  getResult,
  getPatchRequest,
  typicalPayload,
  getFindResultWithSingleHit,
  nonRuleFindResult,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { patchRulesRoute } from './patch_rules_route';

describe('patch_rules', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit()); // existing rule
    clients.alertsClient.update.mockResolvedValue(getResult()); // successful update
    clients.savedObjectsClient.find.mockResolvedValue(getFindResultStatus()); // successful transform

    patchRulesRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when updating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.alertsClient.find.mockResolvedValue(getEmptyFindResult());
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({ message: 'Not Found', status_code: 404 });
    });

    test('returns error if requesting a non-rule', async () => {
      clients.alertsClient.find.mockResolvedValue(nonRuleFindResult());
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: expect.stringContaining('not found'),
        status_code: 404,
      });
    });

    test('catches error if update throws error', async () => {
      clients.alertsClient.update.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getPatchRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...typicalPayload(), rule_id: undefined },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        '"value" must contain at least one of [id, rule_id]'
      );
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...typicalPayload(), type: 'query' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...typicalPayload(), type: 'unknown_type' },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'child "type" fails because ["type" must be one of [query, saved_query]]'
      );
    });
  });
});
