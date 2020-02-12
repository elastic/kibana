/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ServerInjectOptions } from 'hapi';
import {
  createMockServer,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutSavedObjectDecoration,
  getMockNonEmptyIndex,
} from '../__mocks__/_mock_server';
import { createRulesRoute } from './create_rules_route';
import { importRulesRequest } from '../__mocks__/request_responses';
import { getSimpleRule } from '../../../../../../../../test/detection_engine_api_integration/security_and_spaces/tests/utils';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

import { importRulesRoute } from './import_rules_route';

/**
 * Given an array of rule_id strings this will return a ndjson buffer which is useful
 * for testing uploads.
 * @param ruleIds Array of strings of rule_ids
 */
const getSimpleRuleAsNdjson = (ruleIds: string[]): Buffer => {
  const multipartPayload = [
    '--AaB03x\r',
    'content-disposition: form-data; name="file"; filename="rules.ndjson"\r',
  ];

  const resultingPayload = ruleIds.reduce((acc, ruleId) => {
    const simpleRule = getSimpleRule(ruleId);
    acc.push(JSON.stringify(simpleRule));
    return acc;
  }, multipartPayload);

  resultingPayload.push('--AaB03x\r');

  return Buffer.from(resultingPayload.join('\n'));
};

describe('import_rules_route', () => {
  let {
    server,
    alertsClient,
    actionsClient,
    savedObjectsClient,
    elasticsearch,
  } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({
      server,
      alertsClient,
      actionsClient,
      savedObjectsClient,
      elasticsearch,
    } = createMockServer());
    elasticsearch.getCluster = getMockNonEmptyIndex();
    importRulesRoute(server);
  });

  describe('status codes with savedObjectsClient and alertClient', () => {
    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(importRulesRequest());
      expect(statusCode).toBe(404);
    });

    test('returns 404 if savedObjectsClient is not available on the route', async () => {
      const { serverWithoutSavedObjectClient } = createMockServerWithoutSavedObjectDecoration();
      createRulesRoute(serverWithoutSavedObjectClient);
      const { statusCode } = await serverWithoutSavedObjectClient.inject(importRulesRequest());
      expect(statusCode).toBe(404);
    });
  });

  describe('payload', () => {
    test('returns 415 if file extension type is not .ndjson', async () => {
      // when not specified, content-type is application/json
      const request: ServerInjectOptions = {
        method: 'POST',
        url: `${DETECTION_ENGINE_RULES_URL}/_import`,
        payload: getSimpleRule('rule-1'),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(415);
    });
  });

  describe('single rule import', () => {
    test('returns 200 if rule imported successfully', async () => {
      const request: ServerInjectOptions = {
        method: 'POST',
        url: `${DETECTION_ENGINE_RULES_URL}/_import`,
        headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' },
        payload: getSimpleRuleAsNdjson(['rule-1']),
      };
      const { statusCode } = await server.inject(request);
      expect(statusCode).toBe(200);
    });

    describe('rule with existing rule_id', () => {
      test('returns 200 with reported conflict if `overwrite` is set to `false`', async () => {
        const request1: ServerInjectOptions = {
          method: 'POST',
          url: `${DETECTION_ENGINE_RULES_URL}/_import`,
          headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' },
          payload: getSimpleRuleAsNdjson(['rule-1']),
        };
        const request2: ServerInjectOptions = {
          method: 'POST',
          url: `${DETECTION_ENGINE_RULES_URL}/_import`,
          headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' },
          payload: getSimpleRuleAsNdjson(['rule-1']),
        };
        await server.inject(request1);
        const { result, statusCode } = await server.inject(request2);
        expect(statusCode).toBe(200);
        expect(result?.message).toMatch(/rule_id: rule-1 already exists/);
      });

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {
        const request1: ServerInjectOptions = {
          method: 'POST',
          url: `${DETECTION_ENGINE_RULES_URL}/_import`,
          headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' },
          payload: getSimpleRuleAsNdjson(['rule-1']),
        };
        const request2: ServerInjectOptions = {
          method: 'POST',
          url: `${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`,
          headers: { 'content-type': 'multipart/form-data; boundary=AaB03x' },
          payload: getSimpleRuleAsNdjson(['rule-1']),
        };
        await server.inject(request1);
        const { statusCode } = await server.inject(request2);
        expect(statusCode).toBe(200);
      });
    });
  });

  describe('multi rule import', () => {
    test('returns 200 if all rules imported successfully', async () => {});

    describe('rules with matching rule_id', () => {
      test('returns 200 with reported conflict if `overwrite` is set to `false`', async () => {});

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {});
    });

    describe('rules with existing rule_id', () => {
      test('returns 200 with reported conflict if `overwrite` is set to `false`', async () => {});

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {});
    });
  });
});
