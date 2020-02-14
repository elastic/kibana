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
} from '../__mocks__/_mock_server';
import { createRulesRoute } from './create_rules_route';
import { ServerInjectOptions } from 'hapi';
import {
  getFindResult,
  getResult,
  createActionResult,
  typicalPayload,
  getReadBulkRequest,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { createRulesBulkRoute } from './create_rules_bulk_route';
import { BulkError } from '../utils';
import { OutputRuleAlertRest } from '../../types';

describe('create_rules_bulk', () => {
  let { server, alertsClient, actionsClient, elasticsearch } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient, elasticsearch } = createMockServer());
    createRulesBulkRoute(server);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { statusCode } = await server.inject(getReadBulkRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      createRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(getReadBulkRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(getReadBulkRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      createRulesRoute(serverWithoutActionOrAlertClient);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getReadBulkRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('it gets a 409 if the index does not exist', async () => {
      elasticsearch.getCluster = getMockEmptyIndex();
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { payload } = await server.inject(getReadBulkRequest());
      expect(JSON.parse(payload)).toEqual([
        {
          error: {
            message:
              'To create a rule, the index must exist first. Index .siem-signals does not exist',
            status_code: 400,
          },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('returns 200 if rule_id is not given as the id is auto generated from the alert framework', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      // missing rule_id should return 200 as it will be auto generated if not given
      const { rule_id, ...noRuleId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        payload: [noRuleId],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if type is query', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        payload: [
          {
            ...noType,
            type: 'query',
          },
        ],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
        payload: [
          {
            ...noType,
            type: 'something-made-up',
          },
        ],
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });

  test('returns 409 if duplicate rule_ids found in request payload', async () => {
    alertsClient.find.mockResolvedValue(getFindResult());
    alertsClient.get.mockResolvedValue(getResult());
    actionsClient.create.mockResolvedValue(createActionResult());
    alertsClient.create.mockResolvedValue(getResult());
    const request: ServerInjectOptions = {
      method: 'POST',
      url: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
      payload: [typicalPayload(), typicalPayload()],
    };
    const { payload } = await server.inject(request);
    const output: Array<BulkError | Partial<OutputRuleAlertRest>> = JSON.parse(payload);
    expect(output.some(item => item.error?.status_code === 409)).toBeTruthy();
  });

  test('returns one error object in response when duplicate rule_ids found in request payload', async () => {
    alertsClient.find.mockResolvedValue(getFindResult());
    alertsClient.get.mockResolvedValue(getResult());
    actionsClient.create.mockResolvedValue(createActionResult());
    alertsClient.create.mockResolvedValue(getResult());
    const request: ServerInjectOptions = {
      method: 'POST',
      url: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
      payload: [typicalPayload(), typicalPayload()],
    };
    const { payload } = await server.inject(request);
    const output: Array<BulkError | Partial<OutputRuleAlertRest>> = JSON.parse(payload);
    expect(output.length).toBe(1);
  });
});
