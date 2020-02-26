/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  typicalPayload,
  getReadBulkRequest,
  getEmptyIndex,
  getNonEmptyIndex,
  getFindResultWithSingleHit,
  getEmptyFindResult,
  getResult,
} from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock, responseMock } from '../__mocks__';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRulesBulkRoute } from './create_rules_bulk_route';

describe('create_rules_bulk', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex()); // index exists
    clients.alertsClient.find.mockResolvedValue(getEmptyFindResult()); // no existing rules
    clients.alertsClient.create.mockResolvedValue(getResult()); // successful creation

    createRulesBulkRoute(server.router);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      context.alerting.getAlertsClient = jest.fn();
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('unhappy paths', () => {
    it('returns an error object if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.ok).toHaveBeenCalledWith({
        body: expect.arrayContaining([
          {
            error: {
              message:
                'To create a rule, the index must exist first. Index .siem-signals does not exist',
              status_code: 400,
            },
            rule_id: 'rule-1',
          },
        ]),
      });
    });

    test('returns a duplicate error if rule_id already exists', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.ok).toHaveBeenCalledWith({
        body: [
          expect.objectContaining({
            error: {
              message: expect.stringContaining('already exists'),
              status_code: 409,
            },
          }),
        ],
      });
    });

    test('catches error if creation throws', async () => {
      clients.alertsClient.create.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(getReadBulkRequest(), context);
      expect(response.ok).toHaveBeenCalledWith({
        body: [
          expect.objectContaining({
            error: {
              message: 'Test error',
              status_code: 500,
            },
          }),
        ],
      });
    });

    it('returns an error object if duplicate rule_ids found in request payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        body: [typicalPayload(), typicalPayload()],
      });
      const response = await server.inject(request, context);

      expect(response.ok).toHaveBeenCalledWith({
        body: [
          expect.objectContaining({
            error: {
              message: expect.stringContaining('already exists'),
              status_code: 409,
            },
          }),
        ],
      });
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const body = [{ ...typicalPayload(), type: 'query' }];
      const response = responseMock.create();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const body = [{ ...typicalPayload(), type: 'unexpected_type' }];
      const response = responseMock.create();
      // @ts-ignore ambiguous validation types
      server.getRoute().config.validate.body(body, response);

      expect(response.badRequest).toHaveBeenCalled();
    });
  });
});
