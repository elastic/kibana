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
  getMockEmptyIndex,
  getMockNonEmptyIndex,
} from '../__mocks__/_mock_server';
import { createRulesRoute } from './create_rules_route';
import {
  getFindResult,
  getResult,
  createActionResult,
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';

jest.mock('../../rules/get_prepackaged_rules', () => {
  return {
    getPrepackagedRules: (): PrepackagedRules[] => {
      return [
        {
          tags: [],
          immutable: true,
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

import { addPrepackedRulesRoute } from './add_prepackaged_rules_route';
import { PrepackagedRules } from '../../types';

describe('add_prepackaged_rules_route', () => {
  let { server, alertsClient, actionsClient, elasticsearch } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient, elasticsearch } = createMockServer());
    elasticsearch.getCluster = getMockNonEmptyIndex();

    addPrepackedRulesRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(addPrepackagedRulesRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      createRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(addPrepackagedRulesRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(addPrepackagedRulesRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      createRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(
        addPrepackagedRulesRequest()
      );
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('it returns a 400 if the index does not exist', async () => {
      elasticsearch.getCluster = getMockEmptyIndex();
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(addPrepackagedRulesRequest());
      expect(JSON.parse(payload)).toEqual({
        message:
          'Pre-packaged rules cannot be installed until the space index is created: .siem-signals-default',
        status_code: 400,
      });
    });
  });

  describe('payload', () => {
    test('1 rule is installed and 0 are updated when find results are empty', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(addPrepackagedRulesRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_installed: 1,
        rules_updated: 0,
      });
    });

    test('1 rule is updated and 0 are installed when we return a single find and the versions are different', async () => {
      alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(addPrepackagedRulesRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_installed: 0,
        rules_updated: 1,
      });
    });
  });
});
