/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { findAlertRoute } from './find';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib/license_api_access';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { rulesClientMock } from '../../rules_client.mock';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { trackLegacyTerminology } from '../lib/track_legacy_terminology';
import { docLinksServiceMock } from '@kbn/core/server/mocks';

const rulesClient = rulesClientMock.create();

jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../lib/track_legacy_route_usage', () => ({
  trackLegacyRouteUsage: jest.fn(),
}));

jest.mock('../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('findAlertRoute', () => {
  const docLinks = docLinksServiceMock.createSetupContract();

  it('finds alerts with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState, docLinks);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_find"`);
    expect(config.options?.access).toBe('public');

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [],
          "page": 1,
          "perPage": 1,
          "total": 0,
        },
      }
    `);

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    expect(rulesClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "excludeFromPublicApi": true,
          "options": Object {
            "defaultSearchOperator": "OR",
            "page": 1,
            "perPage": 1,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: findResult,
    });
  });

  it('should have internal access for serverless', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState, docLinks, undefined, true);

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_find"`);
    expect(config.options?.access).toBe('internal');
  });

  it('ensures the license allows finding alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState, docLinks);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.find.mockResolvedValueOnce({
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents finding alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    findAlertRoute(router, licenseState, docLinks);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track every call', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    findAlertRoute(router, licenseState, docLinks, mockUsageCounter);
    const [, handler] = router.get.mock.calls[0];
    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, query: {} }, [
      'ok',
    ]);
    await handler(context, req, res);
    expect(trackLegacyRouteUsage).toHaveBeenCalledWith('find', mockUsageCounter);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    findAlertRoute(router, licenseState, docLinks, mockUsageCounter);
    const [, handler] = router.get.mock.calls[0];

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          search_fields: ['alertTypeId:1', 'message:foo'],
          search: 'alertTypeId:2',
          sort_field: 'alertTypeId',
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(trackLegacyTerminology).toHaveBeenCalledTimes(1);
    expect((trackLegacyTerminology as jest.Mock).mock.calls[0][0]).toStrictEqual([
      'alertTypeId:2',
      ['alertTypeId:1', 'message:foo'],
      'alertTypeId',
    ]);
  });

  it('should track calls to deprecated functionality', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    findAlertRoute(router, licenseState, docLinks, mockUsageCounter);
    const [, handler] = router.get.mock.calls[0];
    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          fields: ['foo', 'bar'],
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: `legacyAlertingFieldsUsage`,
      counterType: 'alertingFieldsUsage',
      incrementBy: 1,
    });
  });

  it('does not return system actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState, docLinks);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [
        {
          id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
          notifyWhen: 'onActiveAlert' as const,
          alertTypeId: '.index-threshold',
          name: 'stressing index-threshold 37/200',
          consumer: 'alerts',
          tags: [],
          enabled: true,
          throttle: null,
          apiKey: null,
          apiKeyOwner: '2889684073',
          createdBy: 'elastic',
          updatedBy: '2889684073',
          muteAll: false,
          mutedInstanceIds: [],
          schedule: {
            interval: '1s',
          },
          actions: [
            {
              actionTypeId: '.server-log',
              params: {
                message: 'alert 37: {{context.message}}',
              },
              group: 'threshold met',
              id: '3619a0d0-582b-11ec-8995-2b1578a3bc5d',
              uuid: '123-456',
            },
          ],
          systemActions: [
            { actionTypeId: '.test', id: 'system_action-id', params: {}, uuid: '789' },
          ],
          params: { x: 42 },
          updatedAt: '2024-03-21T13:15:00.498Z',
          createdAt: '2024-03-21T13:15:00.498Z',
          scheduledTaskId: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
          executionStatus: {
            status: 'ok' as const,
            lastExecutionDate: '2024-03-21T13:15:00.498Z',
            lastDuration: 1194,
          },
          revision: 0,
        },
      ],
    };

    // @ts-expect-error: TS complains about dates being string and not a Date object
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [
            Object {
              "actions": Array [
                Object {
                  "actionTypeId": ".server-log",
                  "group": "threshold met",
                  "id": "3619a0d0-582b-11ec-8995-2b1578a3bc5d",
                  "params": Object {
                    "message": "alert 37: {{context.message}}",
                  },
                  "uuid": "123-456",
                },
              ],
              "alertTypeId": ".index-threshold",
              "apiKey": null,
              "apiKeyOwner": "2889684073",
              "consumer": "alerts",
              "createdAt": "2024-03-21T13:15:00.498Z",
              "createdBy": "elastic",
              "enabled": true,
              "executionStatus": Object {
                "lastDuration": 1194,
                "lastExecutionDate": "2024-03-21T13:15:00.498Z",
                "status": "ok",
              },
              "id": "3d534c70-582b-11ec-8995-2b1578a3bc5d",
              "muteAll": false,
              "mutedInstanceIds": Array [],
              "name": "stressing index-threshold 37/200",
              "notifyWhen": "onActiveAlert",
              "params": Object {
                "x": 42,
              },
              "revision": 0,
              "schedule": Object {
                "interval": "1s",
              },
              "scheduledTaskId": "52125fb0-5895-11ec-ae69-bb65d1a71b72",
              "tags": Array [],
              "throttle": null,
              "updatedAt": "2024-03-21T13:15:00.498Z",
              "updatedBy": "2889684073",
            },
          ],
          "page": 1,
          "perPage": 1,
          "total": 0,
        },
      }
    `);

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    expect(rulesClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "excludeFromPublicApi": true,
          "options": Object {
            "defaultSearchOperator": "OR",
            "page": 1,
            "perPage": 1,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: omit(findResult, 'data[0].systemActions'),
    });
  });

  it('should be deprecated', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState, docLinks);

    const [config] = router.get.mock.calls[0];

    expect(config.options?.deprecated).toMatchInlineSnapshot(
      {
        documentationUrl: expect.stringMatching(/#breaking-201550$/),
      },
      `
      Object {
        "documentationUrl": StringMatching /#breaking-201550\\$/,
        "reason": Object {
          "newApiMethod": "GET",
          "newApiPath": "/api/alerting/rules/_find",
          "type": "migrate",
        },
        "severity": "warning",
      }
    `
    );
  });
});
