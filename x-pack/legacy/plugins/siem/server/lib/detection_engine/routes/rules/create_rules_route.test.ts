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
} from '../__mocks__/_mock_server';
import { createRulesRoute } from './create_rules_route';
import { ServerInjectOptions } from 'hapi';
import { ServerFacade } from '../../../../types';

import {
  getFindResult,
  getResult,
  createActionResult,
  getCreateRequest,
  typicalPayload,
  getFindResultStatus,
} from '../__mocks__/request_responses';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

describe('create_rules', () => {
  let {
    server,
    alertsClient,
    actionsClient,
    elasticsearch,
    savedObjectsClient,
  } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({
      server,
      alertsClient,
      actionsClient,
      elasticsearch,
      savedObjectsClient,
    } = createMockServer());
    elasticsearch.getCluster = jest.fn().mockImplementation(() => ({
      callWithRequest: jest
        .fn()
        .mockImplementation((endpoint, params) => ({ _shards: { total: 1 } })),
    }));

    createRulesRoute((server as unknown) as ServerFacade);
  });

  describe('status codes with actionClient and alertClient', () => {
    test('returns 200 when creating a single rule with a valid actionClient and alertClient', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { statusCode } = await server.inject(getCreateRequest());
      expect(statusCode).toBe(200);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      createRulesRoute((serverWithoutActionClient as unknown) as ServerFacade);
      const { statusCode } = await serverWithoutActionClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createRulesRoute((serverWithoutAlertClient as unknown) as ServerFacade);
      const { statusCode } = await serverWithoutAlertClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if alertClient and actionClient are both not available on the route', async () => {
      const {
        serverWithoutActionOrAlertClient,
      } = createMockServerWithoutActionOrAlertClientDecoration();
      createRulesRoute((serverWithoutActionOrAlertClient as unknown) as ServerFacade);
      const { statusCode } = await serverWithoutActionOrAlertClient.inject(getCreateRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('validation', () => {
    test('returns 200 if rule_id is not given as the id is auto generated from the alert framework', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      // missing rule_id should return 200 as it will be auto generated if not given
      const { rule_id, ...noRuleId } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_RULES_URL,
        payload: noRuleId,
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 200 if type is query', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_RULES_URL,
        payload: {
          ...noType,
          type: 'query',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    test('returns 400 if type is not filter or kql', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());
      const { type, ...noType } = typicalPayload();
      const request: ServerInjectOptions = {
        method: 'POST',
        url: DETECTION_ENGINE_RULES_URL,
        payload: {
          ...noType,
          type: 'something-made-up',
        },
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(400);
    });
  });
});
