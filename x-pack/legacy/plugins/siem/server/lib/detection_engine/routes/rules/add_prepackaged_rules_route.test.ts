/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { createRulesRoute } from './create_rules_route';
import {
  getFindResult,
  getResult,
  createActionResult,
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
  getEmptyIndex,
  getNonEmptyIndex,
} from '../__mocks__/request_responses';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';

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
  let server = createMockServer();
  let config = createMockConfig();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();

    server = createMockServer();
    config = createMockConfig();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());

    addPrepackedRulesRoute(server.route, config, getClients);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(addPrepackagedRulesRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const { inject, route } = createMockServer();
      createRulesRoute(route, config, getClients);
      const { statusCode } = await inject(addPrepackagedRulesRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('it returns a 400 if the index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(addPrepackagedRulesRequest());
      expect(JSON.parse(payload)).toEqual({
        message: expect.stringContaining(
          'Pre-packaged rules cannot be installed until the space index is created'
        ),
        status_code: 400,
      });
    });
  });

  describe('payload', () => {
    test('1 rule is installed and 0 are updated when find results are empty', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(addPrepackagedRulesRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_installed: 1,
        rules_updated: 0,
      });
    });

    test('1 rule is updated and 0 are installed when we return a single find and the versions are different', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.actionsClient.create.mockResolvedValue(createActionResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(addPrepackagedRulesRequest());
      expect(JSON.parse(payload)).toEqual({
        rules_installed: 0,
        rules_updated: 1,
      });
    });
  });
});
