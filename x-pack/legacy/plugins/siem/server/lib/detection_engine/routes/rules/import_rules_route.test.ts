/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getSimpleRuleAsMultipartContent } from '../../../../../../../../test/detection_engine_api_integration/security_and_spaces/tests/utils';
import {
  createMockServer,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutSavedObjectDecoration,
  getMockNonEmptyIndex,
  getMockEmptyIndex,
} from '../__mocks__/_mock_server';
import { ImportSuccessError } from '../utils';
import {
  importRulesRequest,
  importRulesRequestOverwriteTrue,
  getFindResult,
  getResult,
  createActionResult,
  getFindResultWithSingleHit,
} from '../__mocks__/request_responses';
import { createRulesRoute } from './create_rules_route';

import { importRulesRoute } from './import_rules_route';

describe('import_rules_route', () => {
  let { server, alertsClient, actionsClient, elasticsearch } = createMockServer();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ server, alertsClient, actionsClient, elasticsearch } = createMockServer());
    elasticsearch.getCluster = getMockNonEmptyIndex();
    importRulesRoute(server);
  });

  describe('status codes with savedObjectsClient and alertClient', () => {
    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      createRulesRoute(serverWithoutAlertClient);
      const { statusCode, payload } = await serverWithoutAlertClient.inject(importRulesRequest());
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404,
      });
      expect(statusCode).toEqual(404);
    });

    test('returns 404 if savedObjectsClient is not available on the route', async () => {
      const { serverWithoutSavedObjectClient } = createMockServerWithoutSavedObjectDecoration();
      createRulesRoute(serverWithoutSavedObjectClient);
      const { statusCode, payload } = await serverWithoutSavedObjectClient.inject(
        importRulesRequest()
      );
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404,
      });
      expect(statusCode).toEqual(404);
    });

    test('returns reported error if index does not exist', async () => {
      elasticsearch.getCluster = getMockEmptyIndex();
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());

      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [
          {
            error: {
              message:
                'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ],
        success: false,
        success_count: 0,
      });
      expect(statusCode).toEqual(200);
    });
  });

  describe('payload', () => {
    test('returns 400 if file extension type is not .ndjson', async () => {
      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1'], false);
      const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        message: 'Invalid file extension .json',
        status_code: 400,
      });
      expect(statusCode).toEqual(400);
    });
  });

  describe('single rule import', () => {
    test('returns 200 if rule imported successfully', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());

      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [],
        success: true,
        success_count: 1,
      });
      expect(statusCode).toEqual(200);
    });

    test('returns reported conflict if error parsing rule', async () => {
      const multipartPayload =
        '--frank_is_awesome\r\n' +
        `Content-Disposition: form-data; name="file"; filename="rules.ndjson"\r\n` +
        'Content-Type: application/octet-stream\r\n' +
        '\r\n' +
        '{"name"::"Simple Rule Query","description":"Simple Rule Query","risk_score":1,"rule_id":"rule-1","severity":"high","type":"query","query":"user.name: root or user.name: admin"}\r\n' +
        '--frank_is_awesome--\r\n';

      alertsClient.find.mockResolvedValue(getFindResult());

      const requestPayload = Buffer.from(multipartPayload);
      const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [
          {
            error: {
              message: 'Unexpected token : in JSON at position 8',
              status_code: 400,
            },
            rule_id: '(unknown)',
          },
        ],
        success: false,
        success_count: 0,
      });
      expect(statusCode).toEqual(200);
    });

    describe('rule with existing rule_id', () => {
      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
        const parsed: ImportSuccessError = JSON.parse(payload);

        expect(parsed).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
        alertsClient.get.mockResolvedValue(getResult());

        const { statusCode: statusCodeRequest2, payload: payloadRequest2 } = await server.inject(
          importRulesRequest(requestPayload)
        );
        const parsedRequest2: ImportSuccessError = JSON.parse(payloadRequest2);

        expect(parsedRequest2).toEqual({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 0,
        });
        expect(statusCodeRequest2).toEqual(200);
      });

      test('returns with NO reported conflict if `overwrite` is set to `true`', async () => {
        alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
        const parsed: ImportSuccessError = JSON.parse(payload);

        expect(parsed).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
        alertsClient.get.mockResolvedValue(getResult());

        const { statusCode: statusCodeRequest2, payload: payloadRequest2 } = await server.inject(
          importRulesRequestOverwriteTrue(requestPayload)
        );
        const parsedRequest2: ImportSuccessError = JSON.parse(payloadRequest2);

        expect(parsedRequest2).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCodeRequest2).toEqual(200);
      });
    });
  });

  describe('multi rule import', () => {
    test('returns 200 if all rules imported successfully', async () => {
      alertsClient.find.mockResolvedValue(getFindResult());

      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1', 'rule-2']);
      const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [],
        success: true,
        success_count: 2,
      });
      expect(statusCode).toEqual(200);
    });

    test('returns 200 with reported conflict if error parsing rule', async () => {
      const multipartPayload =
        '--frank_is_awesome\r\n' +
        `Content-Disposition: form-data; name="file"; filename="rules.ndjson"\r\n` +
        'Content-Type: application/octet-stream\r\n' +
        '\r\n' +
        '{"name"::"Simple Rule Query","description":"Simple Rule Query","risk_score":1,"rule_id":"rule-1","severity":"high","type":"query","query":"user.name: root or user.name: admin"}\r\n' +
        '{"name":"Simple Rule Query","description":"Simple Rule Query","risk_score":1,"rule_id":"rule-2","severity":"high","type":"query","query":"user.name: root or user.name: admin"}\r\n' +
        '--frank_is_awesome--\r\n';

      alertsClient.find.mockResolvedValue(getFindResult());

      const requestPayload = Buffer.from(multipartPayload);
      const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [
          {
            error: {
              message: 'Unexpected token : in JSON at position 8',
              status_code: 400,
            },
            rule_id: '(unknown)',
          },
        ],
        success: false,
        success_count: 1,
      });
      expect(statusCode).toEqual(200);
    });

    describe('rules with matching rule_id', () => {
      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        alertsClient.find.mockResolvedValue(getFindResult());
        alertsClient.get.mockResolvedValue(getResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1', 'rule-1']);
        const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
        const parsed: ImportSuccessError = JSON.parse(payload);

        expect(parsed).toEqual({
          errors: [
            {
              error: {
                message: 'More than one rule with rule-id: "rule-1" found',
                status_code: 400,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);
      });

      test('returns with NO reported conflict if `overwrite` is set to `true`', async () => {
        alertsClient.find.mockResolvedValue(getFindResult());
        alertsClient.get.mockResolvedValue(getResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1', 'rule-1']);
        const { statusCode, payload } = await server.inject(
          importRulesRequestOverwriteTrue(requestPayload)
        );
        const parsed: ImportSuccessError = JSON.parse(payload);

        expect(parsed).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);
      });
    });

    describe('rules with existing rule_id', () => {
      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
        const parsedResult: ImportSuccessError = JSON.parse(payload);

        expect(parsedResult).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        alertsClient.find.mockResolvedValueOnce(getFindResultWithSingleHit());
        alertsClient.get.mockResolvedValue(getResult());

        const requestPayload2 = getSimpleRuleAsMultipartContent(['rule-1', 'rule-2', 'rule-3']);
        const { statusCode: statusCodeRequest2, payload: payloadRequest2 } = await server.inject(
          importRulesRequest(requestPayload2)
        );
        const parsed: ImportSuccessError = JSON.parse(payloadRequest2);

        expect(parsed).toEqual({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 2,
        });
        expect(statusCodeRequest2).toEqual(200);
      });

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {
        alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(importRulesRequest(requestPayload));
        const parsedResult: ImportSuccessError = JSON.parse(payload);

        expect(parsedResult).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        alertsClient.find.mockResolvedValueOnce(getFindResultWithSingleHit());
        alertsClient.get.mockResolvedValue(getResult());

        const requestPayload2 = getSimpleRuleAsMultipartContent(['rule-1', 'rule-2', 'rule-3']);
        const { statusCode: statusCodeRequest2, payload: payloadRequest2 } = await server.inject(
          importRulesRequestOverwriteTrue(requestPayload2)
        );
        const parsed: ImportSuccessError = JSON.parse(payloadRequest2);

        expect(parsed).toEqual({
          errors: [],
          success: true,
          success_count: 3,
        });
        expect(statusCodeRequest2).toEqual(200);
      });
    });
  });
});
