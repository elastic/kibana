/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { requestContextMock } from './__mocks__/request_context';
import { requestMock, serverMock } from './__mocks__/server';
import { getAlertFieldsByRuleTypeIds } from './get_alert_fields_by_rule_type_ids';

describe('getAlertFieldsByRuleTypeIds', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let getFieldsForWildcardMock: jest.Mock;
  const coreRequestHandler = coreMock.createRequestHandlerContext();
  const authorizationMock = alertingAuthorizationMock.create();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    IndexPatternsFetcher.prototype.getFieldsForWildcard = getFieldsForWildcardMock;
    getAlertFieldsByRuleTypeIds(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('route registered', async () => {
    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: ['apm.anomaly', 'logs.alert.document.count'] },
      }),
      context
    );

    expect((await context.rac).alerting.getAlertingAuthorizationWithRequest).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  test('should fetch all rule types when ruleTypeIds is empty', async () => {
    jest.spyOn((await context.rac).alerting, 'listTypes').mockReturnValue(
      // @ts-expect-error: rule type properties are not needed for the test
      new Map([
        ['.es-query', {}],
        ['siem.esqlRule', {}],
      ])
    );
    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: [] },
      }),
      context
    );

    expect((await context.rac).alerting.listTypes).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  test('should fetch alert indices separately for siem and other rule types', async () => {
    const newRequest = requestMock.create({
      method: 'get',
      path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
      query: { ruleTypeIds: ['.es-query', 'logs.alert.document.count', 'siem.esqlRule'] },
    });

    jest
      .spyOn((await context.rac).alerting, 'getAlertingAuthorizationWithRequest')
      .mockResolvedValue({
        ...authorizationMock,
        getAllAuthorizedRuleTypesFindOperation: jest.fn().mockResolvedValue(
          new Map([
            ['.es-query', {}],
            ['logs.alert.document.count', {}],
            ['siem.esqlRule', {}],
          ])
        ),
      });

    await server.inject(newRequest, context);

    const alertClient = await (await context.rac).getAlertsClient();

    expect(alertClient.getAuthorizedAlertsIndices).toHaveBeenCalledTimes(2);
    expect(alertClient.getAuthorizedAlertsIndices).nthCalledWith(1, ['siem.esqlRule']);
    expect(alertClient.getAuthorizedAlertsIndices).nthCalledWith(2, [
      '.es-query',
      'logs.alert.document.count',
    ]);
  });

  test('should fetch alert fields correctly', async () => {
    const newRequest = requestMock.create({
      method: 'get',
      path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
      query: { ruleTypeIds: ['.es-query', 'logs.alert.document.count', 'siem.esqlRule'] },
    });

    jest
      .spyOn((await context.rac).alerting, 'getAlertingAuthorizationWithRequest')
      .mockResolvedValue({
        ...authorizationMock,
        getAllAuthorizedRuleTypesFindOperation: jest.fn().mockResolvedValue(
          new Map([
            [
              '.es-query',
              {
                authorizedConsumers: {},
              },
            ],
            ['logs.alert.document.count', { authorizedConsumers: {} }],
            ['siem.esqlRule', { authorizedConsumers: {} }],
          ])
        ),
      });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAuthorizedAlertsIndices: jest.fn().mockImplementation((ruleTypeIds: string[]) => {
        if (ruleTypeIds.includes('siem.esqlRule')) {
          return Promise.resolve(['.alerts-security.alerts-default']);
        } else {
          return Promise.resolve([
            '.alerts-stack.alerts-default',
            '.alerts-observability.logs.alerts-default',
          ]);
        }
      }),
    });

    (await context.rac).dataViews.dataViewsServiceFactory = jest.fn().mockReturnValue({
      getFieldsForWildcard: jest.fn().mockResolvedValueOnce([
        { name: '@timestamp', type: 'date' },
        { name: 'event.category', type: 'string' },
      ]),
    });

    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest.fn().mockResolvedValueOnce({
      fields: [
        { name: 'message', type: 'string' },
        { name: 'log.level', type: 'string' },
      ],
      indices: ['.alerts-stack.alerts-default', '.alerts-observability.logs.alerts-default'],
    });

    const response = await server.inject(newRequest, context);

    expect(response.status).toBe(200);

    expect(response.body.fields).toEqual([
      {
        name: 'message',
        type: 'string',
      },
      {
        name: 'log.level',
        type: 'string',
      },
      {
        name: '@timestamp',
        type: 'date',
      },
      {
        name: 'event.category',
        type: 'string',
      },
    ]);
    expect(response.body.browserFields).toBeDefined();
  });

  test('returns only SIEM fields when no other rule types are authorized', async () => {
    // Mock authorization to return only SIEM rule types
    jest
      .spyOn((await context.rac).alerting, 'getAlertingAuthorizationWithRequest')
      .mockResolvedValueOnce({
        ...authorizationMock,
        getAllAuthorizedRuleTypesFindOperation: jest
          .fn()
          .mockResolvedValueOnce(new Map([['siem.esqlRule', { authorizedConsumers: {} }]])),
      });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAuthorizedAlertsIndices: jest.fn().mockImplementation((ruleTypeIds: string[]) => {
        if (ruleTypeIds.includes('siem.esqlRule')) {
          return Promise.resolve(['.alerts-security.alerts-default']);
        } else {
          return Promise.resolve([]);
        }
      }),
    });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn((await context.rac).dataViews, 'dataViewsServiceFactory').mockResolvedValue({
      getFieldsForWildcard: jest.fn().mockResolvedValueOnce([
        { name: '@timestamp', type: 'date' },
        { name: 'event.category', type: 'string' },
        { name: 'signal.status', type: 'keyword' },
      ]),
    });

    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest.fn().mockResolvedValueOnce({
      fields: [],
      indices: [],
    });

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: ['siem.esqlRule', '.es-query'] },
      }),
      context
    );

    // should not fetch other fields as there are no other indices
    expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).not.toHaveBeenCalled();

    expect(
      (
        await (
          await context.rac
        ).dataViews.dataViewsServiceFactory(
          coreRequestHandler.savedObjects.client,
          coreRequestHandler.elasticsearch.client.asInternalUser
        )
      ).getFieldsForWildcard
    ).toHaveBeenCalledWith({
      allowNoIndex: true,
      includeEmptyFields: false,
      indexFilter: {
        range: {
          '@timestamp': {
            gte: 'now-90d',
          },
        },
      },
      pattern: '.alerts-security.alerts-default',
    });

    expect(response.status).toBe(200);
    expect(response.body.fields).toHaveLength(3);
    expect(response.body.fields).toEqual([
      { name: '@timestamp', type: 'date' },
      { name: 'event.category', type: 'string' },
      { name: 'signal.status', type: 'keyword' },
    ]);
  });

  test('merges fields and removes duplicates', async () => {
    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAuthorizedAlertsIndices: jest.fn().mockImplementation((ruleTypeIds) => {
        if (ruleTypeIds.includes('siem.esqlRule')) {
          return Promise.resolve(['.alerts-security.alerts-default']);
        } else {
          return Promise.resolve(['.alerts-stack.alerts-default']);
        }
      }),
    });

    // SIEM fields
    // @ts-expect-error: mocking only necessary methods
    jest.spyOn((await context.rac).dataViews, 'dataViewsServiceFactory').mockResolvedValue({
      getFieldsForWildcard: jest.fn().mockResolvedValueOnce([
        { name: 'user.name', type: 'string' },
        { name: 'source.ip', type: 'ip' },
      ]),
    });

    // Other fields
    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest.fn().mockResolvedValueOnce({
      fields: [
        { name: 'source.ip', type: 'ip' },
        { name: 'destination.port', type: 'number' },
      ],
      indices: ['.alerts-stack.alerts-default'],
    });

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: ['siem.esqlRule', '.es-query'] },
      }),
      context
    );

    expect(response.body.fields).toHaveLength(3);
    expect(response.body.fields).toEqual([
      { name: 'source.ip', type: 'ip' },
      { name: 'destination.port', type: 'number' },
      { name: 'user.name', type: 'string' },
    ]);
  });

  test('handles errors when fetching fields fails', async () => {
    jest
      .spyOn((await context.rac).alerting, 'getAlertingAuthorizationWithRequest')
      .mockResolvedValue({
        ...authorizationMock,
        getAllAuthorizedRuleTypesFindOperation: jest
          .fn()
          .mockResolvedValue(new Map([['.es-query', { authorizedConsumers: {} }]])),
      });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAuthorizedAlertsIndices: jest.fn().mockImplementation((ruleTypeIds) => {
        if (ruleTypeIds.includes('siem.esqlRule')) {
          return Promise.resolve([]);
        } else {
          return Promise.resolve(['.alerts-stack.alerts-default']);
        }
      }),
    });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn((await context.rac).dataViews, 'dataViewsServiceFactory').mockResolvedValue({
      getFieldsForWildcard: jest.fn().mockResolvedValueOnce([]),
    });

    // Other fields
    IndexPatternsFetcher.prototype.getFieldsForWildcard = jest
      .fn()
      .mockRejectedValue(new Error('Failed to fetch fields'));

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: ['.es-query'] },
      }),
      context
    );

    expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Failed to fetch fields',
    });
  });
});
