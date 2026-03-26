/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../../common/constants';
import { requestContextMock } from '../__mocks__/request_context';
import { requestMock, serverMock } from '../__mocks__/server';
import { getAlertFieldsByRuleTypeIds } from './get_alert_fields_by_rule_type_ids';

describe('getAlertFieldsByRuleTypeIds', () => {
  let server: ReturnType<typeof serverMock.create>;
  const { context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    getAlertFieldsByRuleTypeIds(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('route registered', async () => {
    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAlertFields: jest.fn().mockImplementation((ruleTypeIds: string[]) => {
        return Promise.resolve({
          fields: [],
        });
      }),
    });

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: ['apm.anomaly', 'logs.alert.document.count'] },
      }),
      context
    );

    expect((await (await context.rac).getAlertsClient()).getAlertFields).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  test('should fetch alert fields correctly', async () => {
    const newRequest = requestMock.create({
      method: 'get',
      path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
      query: { ruleTypeIds: ['.es-query', 'logs.alert.document.count', 'siem.esqlRule'] },
    });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAlertFields: jest.fn().mockImplementation((ruleTypeIds: string[]) => {
        return Promise.resolve({
          fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'event.category', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'log.level', type: 'string' },
          ],
          alertFields: {
            '@timestamp': { type: 'date' },
            'event.category': { type: 'string' },
            message: { type: 'string' },
            'log.level': { type: 'string' },
          },
        });
      }),
    });

    const response = await server.inject(newRequest, context);

    expect(response.status).toBe(200);

    expect(response.body.fields).toEqual([
      {
        name: '@timestamp',
        type: 'date',
      },
      {
        name: 'event.category',
        type: 'string',
      },
      {
        name: 'message',
        type: 'string',
      },
      {
        name: 'log.level',
        type: 'string',
      },
    ]);
  });

  test('should fetch alert fields for single rule type correctly', async () => {
    const newRequest = requestMock.create({
      method: 'get',
      path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
      query: { ruleTypeIds: '.es-query' },
    });

    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAlertFields: jest.fn().mockImplementation((ruleTypeIds: string[]) => {
        return Promise.resolve({
          fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'message', type: 'string' },
          ],
        });
      }),
    });

    const response = await server.inject(newRequest, context);

    expect(response.status).toBe(200);

    expect(response.body.fields).toEqual([
      {
        name: '@timestamp',
        type: 'date',
      },
      {
        name: 'message',
        type: 'string',
      },
    ]);
  });

  test('handles errors when fetching fields fails', async () => {
    // @ts-expect-error: mocking only necessary methods
    jest.spyOn(await context.rac, 'getAlertsClient').mockResolvedValue({
      getAlertFields: jest.fn().mockImplementation((ruleTypeIds: string[]) => {
        return Promise.reject(new Error('Failed to fetch fields'));
      }),
    });

    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: `${BASE_RAC_ALERTS_API_PATH}/alert_fields`,
        query: { ruleTypeIds: ['.es-query'] },
      }),
      context
    );

    expect((await (await context.rac).getAlertsClient()).getAlertFields).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Failed to fetch fields',
    });
  });
});
