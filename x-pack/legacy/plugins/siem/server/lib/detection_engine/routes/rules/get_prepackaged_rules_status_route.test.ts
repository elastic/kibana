/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMockServer,
  createMockServerWithoutActionClientDecoration,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutActionOrAlertClientDecoration,
  getMockNonEmptyIndex,
} from '../__mocks__/_mock_server';
import { createRulesRoute } from './create_rules_route';
import {
  getFindResult,
  getResult,
  createActionResult,
  getFindResultWithSingleHit,
  getPrepackagedRulesStatusRequest,
} from '../__mocks__/request_responses';

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

import { getPrepackagedRulesStatusRoute } from './get_prepackaged_rules_status_route';

describe('get_prepackaged_rule_status_route', () => {
  let { server, alertsClient, actionsClient, elasticsearch } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient, elasticsearch } = createMockServer());
    elasticsearch.getCluster = getMockNonEmptyIndex();
    getPrepackagedRulesStatusRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getPrepackagedRulesStatusRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      createRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(
        getPrepackagedRulesStatusRequest()
      );
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(
        getPrepackagedRulesStatusRequest()
      );
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      createRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(
        getPrepackagedRulesStatusRequest()
      );
      expect(statusCode).toBe(404);
    });
  });

  describe('payload', () => {
    test('0 rules installed, 0 custom rules, 1 rules not installed, and 1 rule not updated', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(getPrepackagedRulesStatusRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_custom_installed: 0,
        rules_installed: 0,
        rules_not_installed: 1,
        rules_not_updated: 0,
      });
    });

    test('1 rule installed, 1 custom rules, 0 rules not installed, and 1 rule to not updated', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
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
