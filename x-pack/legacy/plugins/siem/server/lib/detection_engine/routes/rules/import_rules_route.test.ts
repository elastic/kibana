/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getSimpleRuleAsMultipartContent,
  TEST_BOUNDARY,
  UNPARSABLE_LINE,
  getSimpleRule,
} from '../__mocks__/utils';
import {
  createMockServer,
  createMockServerWithoutAlertClientDecoration,
  createMockServerWithoutSavedObjectDecoration,
  getMockNonEmptyIndex,
  getMockEmptyIndex,
  createMockServerWithoutActionClientDecoration,
} from '../__mocks__/_mock_server';
import { ImportSuccessError } from '../utils';
import {
  getImportRulesRequest,
  getImportRulesRequestOverwriteTrue,
  getFindResult,
  getResult,
  createActionResult,
  getFindResultWithSingleHit,
  getFindResultStatus,
} from '../__mocks__/request_responses';

import { importRulesRoute } from './import_rules_route';

describe('import_rules_route', () => {
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
    elasticsearch.getCluster = getMockNonEmptyIndex();
    importRulesRoute(server);
  });

  describe('status codes with savedObjectsClient and alertClient', () => {
    test('returns 404 if alertClient is not available on the route', async () => {
      const { serverWithoutAlertClient } = createMockServerWithoutAlertClientDecoration();
      importRulesRoute(serverWithoutAlertClient);
      const { statusCode } = await serverWithoutAlertClient.inject(
        getImportRulesRequest(getSimpleRuleAsMultipartContent(['rule-1']))
      );
      expect(statusCode).toEqual(404);
    });

    test('returns 404 if actionClient is not available on the route', async () => {
      const { serverWithoutActionClient } = createMockServerWithoutActionClientDecoration();
      importRulesRoute(serverWithoutActionClient);
      const { statusCode } = await serverWithoutActionClient.inject(
        getImportRulesRequest(getSimpleRuleAsMultipartContent(['rule-1']))
      );
      expect(statusCode).toBe(404);
    });

    test('returns 404 if savedObjectsClient is not available on the route', async () => {
      const { serverWithoutSavedObjectClient } = createMockServerWithoutSavedObjectDecoration();
      importRulesRoute(serverWithoutSavedObjectClient);
      const { statusCode } = await serverWithoutSavedObjectClient.inject(
        getImportRulesRequest(getSimpleRuleAsMultipartContent(['rule-1']))
      );

      expect(statusCode).toEqual(404);
    });

    test('returns reported error if index does not exist', async () => {
      elasticsearch.getCluster = getMockEmptyIndex();
      alertsClient.find.mockResolvedValue(getFindResult());
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
      alertsClient.get.mockResolvedValue(getResult());
      actionsClient.create.mockResolvedValue(createActionResult());
      alertsClient.create.mockResolvedValue(getResult());
      savedObjectsClient.find.mockResolvedValue(getFindResultStatus());

      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
        `--${TEST_BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="rules.ndjson"\r\n` +
        'Content-Type: application/octet-stream\r\n' +
        '\r\n' +
        `${UNPARSABLE_LINE}\r\n` +
        `--${TEST_BOUNDARY}--\r\n`;

      alertsClient.find.mockResolvedValue(getFindResult());

      const requestPayload = Buffer.from(multipartPayload);
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [
          {
            error: {
              message: 'Unexpected token : in JSON at position 8',
              status_code: 400,
            },
            rule_id: '(unknown id)',
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
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
          getImportRulesRequest(requestPayload)
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
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
          getImportRulesRequestOverwriteTrue(requestPayload)
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
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
        `--${TEST_BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="rules.ndjson"\r\n` +
        'Content-Type: application/octet-stream\r\n' +
        '\r\n' +
        `${UNPARSABLE_LINE}\r\n` +
        `${JSON.stringify(getSimpleRule('rule-2'))}\r\n` +
        `--${TEST_BOUNDARY}--\r\n`;

      alertsClient.find.mockResolvedValue(getFindResult());

      const requestPayload = Buffer.from(multipartPayload);
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [
          {
            error: {
              message: 'Unexpected token : in JSON at position 8',
              status_code: 400,
            },
            rule_id: '(unknown id)',
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
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
          getImportRulesRequestOverwriteTrue(requestPayload)
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
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
          getImportRulesRequest(requestPayload2)
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
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
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
          getImportRulesRequestOverwriteTrue(requestPayload2)
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
