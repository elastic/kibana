/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import {
  getSimpleRuleAsMultipartContent,
  TEST_BOUNDARY,
  UNPARSABLE_LINE,
  getSimpleRule,
} from '../__mocks__/utils';
import { ImportSuccessError } from '../utils';
import {
  getImportRulesRequest,
  getImportRulesRequestOverwriteTrue,
  getFindResult,
  getResult,
  getEmptyIndex,
  getFindResultWithSingleHit,
  getNonEmptyIndex,
} from '../__mocks__/request_responses';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';
import { importRulesRoute } from './import_rules_route';
import { DEFAULT_SIGNALS_INDEX } from '../../../../../common/constants';

describe('import_rules_route', () => {
  let server = createMockServer();
  let config = createMockConfig();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();

    server = createMockServer();
    config = createMockConfig();
    config = () => ({
      get: jest.fn(value => {
        switch (value) {
          case 'savedObjects.maxImportPayloadBytes': {
            return 10000;
          }
          case 'savedObjects.maxImportExportSize': {
            return 10000;
          }
          case 'xpack.siem.signalsIndex': {
            return DEFAULT_SIGNALS_INDEX;
          }
          default: {
            const dummyMock = jest.fn();
            return dummyMock();
          }
        }
      }),
      has: jest.fn(),
    });
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    clients.spacesClient.getSpaceId.mockReturnValue('default');

    importRulesRoute(server.route, config, getClients);
  });

  describe('status codes with actionsClient and alertClient', () => {
    test('returns 200 when importing a single rule with a valid actionClient and alertClient', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode } = await server.inject(getImportRulesRequest(requestPayload));
      expect(statusCode).toEqual(200);
    });

    test('returns 404 if alertClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('alertsClient', clients));
      const { route, inject } = createMockServer();
      importRulesRoute(route, config, getClients);
      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode } = await inject(getImportRulesRequest(requestPayload));
      expect(statusCode).toEqual(404);
    });

    test('returns 404 if actionsClient is not available on the route', async () => {
      getClients.mockResolvedValue(omit('actionsClient', clients));
      const { route, inject } = createMockServer();
      importRulesRoute(route, config, getClients);
      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode } = await inject(getImportRulesRequest(requestPayload));
      expect(statusCode).toEqual(404);
    });
  });

  describe('validation', () => {
    test('returns reported error if index does not exist', async () => {
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(getEmptyIndex());
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
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

    test('returns 400 when a thrown error is caught', async () => {
      const mockFn = jest.fn();
      const mockThrowError = (): Error => {
        throw new Error();
      };
      clients.clusterClient.callAsCurrentUser.mockResolvedValue(
        mockFn.mockImplementation(mockThrowError)
      );
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
      const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
      const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
      const parsed: ImportSuccessError = JSON.parse(payload);

      expect(parsed).toEqual({
        errors: [
          {
            error: {
              message: "Cannot read property 'total' of undefined",
              status_code: 400,
            },
            rule_id: 'rule-1',
          },
        ],
        success: false,
        success_count: 0,
      });
      expect(statusCode).toEqual(200);
    });

    test('returns 400 if file extension type is not .ndjson', async () => {
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
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
      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
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

      clients.alertsClient.find.mockResolvedValue(getFindResult());
      clients.alertsClient.get.mockResolvedValue(getResult());
      clients.alertsClient.create.mockResolvedValue(getResult());
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
        clients.alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
        const parsed: ImportSuccessError = JSON.parse(payload);

        expect(parsed).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
        clients.alertsClient.get.mockResolvedValue(getResult());

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
        clients.alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
        const parsed: ImportSuccessError = JSON.parse(payload);

        expect(parsed).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());
        clients.alertsClient.get.mockResolvedValue(getResult());

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
      clients.alertsClient.find.mockResolvedValue(getFindResult());

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

      clients.alertsClient.find.mockResolvedValue(getFindResult());

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
        clients.alertsClient.find.mockResolvedValue(getFindResult());
        clients.alertsClient.get.mockResolvedValue(getResult());

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
        clients.alertsClient.find.mockResolvedValue(getFindResult());
        clients.alertsClient.get.mockResolvedValue(getResult());

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
        clients.alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
        const parsedResult: ImportSuccessError = JSON.parse(payload);

        expect(parsedResult).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        clients.alertsClient.find.mockResolvedValueOnce(getFindResultWithSingleHit());
        clients.alertsClient.get.mockResolvedValue(getResult());

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
        clients.alertsClient.find.mockResolvedValue(getFindResult());

        const requestPayload = getSimpleRuleAsMultipartContent(['rule-1']);
        const { statusCode, payload } = await server.inject(getImportRulesRequest(requestPayload));
        const parsedResult: ImportSuccessError = JSON.parse(payload);

        expect(parsedResult).toEqual({
          errors: [],
          success: true,
          success_count: 1,
        });
        expect(statusCode).toEqual(200);

        clients.alertsClient.find.mockResolvedValueOnce(getFindResultWithSingleHit());
        clients.alertsClient.get.mockResolvedValue(getResult());

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
