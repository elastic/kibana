/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { getPrepackagedRulesStatusRoute } from './get_prepackaged_rules_status_route';
import * as findRules from '../../rules/find_rules';

import {
  getFindResult,
  getResult,
  createActionResult,
  getFindResultWithSingleHit,
  getPrepackagedRulesStatusRequest,
  getNonEmptyIndex,
} from '../__mocks__/request_responses';
import { createMockServer, clientsServiceMock } from '../__mocks__';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getPrepackagedRules: () => {
      return [
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          version: 2, // set one higher than the mocks which is set to 1 to trigger updates
        },
      ];
    },
  };
});

describe('get_prepackaged_rule_status_route', () => {
  let server = createMockServer();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    // jest carries state between mocked implementations when using
    // spyOn. So now we're doing all three of these.
    // https://github.com/facebook/jest/issues/7136#issuecomment-565976599
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    server = createMockServer();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());

    getPrepackagedRulesStatusRoute(server.route, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getPrepackagedRulesStatusRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const { route, inject } = createMockServer();
      getPrepackagedRulesStatusRoute(route, getClients);
      const { statusCode } = await inject(getPrepackagedRulesStatusRequest());
      expect(statusCode).toBe(404);
    });

    test('catch error when findRules function throws error', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      jest.spyOn(findRules, 'findRules').mockImplementation(async () => {
        throw new Error('Test error');
      });
      const { payload, statusCode } = await server.inject(getPrepackagedRulesStatusRequest());
      expect(JSON.parse(payload).message).toBe('Test error');
      expect(statusCode).toBe(500);
    });
  });

  describe('payload', () => {
    test('0 rules installed, 0 custom rules, 1 rules not installed, and 1 rule not updated', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(getPrepackagedRulesStatusRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_custom_installed: 0,
        rules_installed: 0,
        rules_not_installed: 1,
        rules_not_updated: 0,
      });
    });

    test('1 rule installed, 1 custom rules, 0 rules not installed, and 1 rule to not updated', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(getPrepackagedRulesStatusRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_custom_installed: 1,
        rules_installed: 1,
        rules_not_installed: 0,
        rules_not_updated: 1,
      });
    });
  });
});
