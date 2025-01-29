/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { getBrowserFieldsByFeatureId } from './get_browser_fields_by_rule_type_ids';
import { requestContextMock } from './__mocks__/request_context';
import { getO11yBrowserFields } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';

describe('getBrowserFieldsByFeatureId', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const path = `${BASE_RAC_ALERTS_API_PATH}/browser_fields`;

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.getAuthorizedAlertsIndices.mockResolvedValue([
      '.alerts-observability.logs.alerts-default',
    ]);

    clients.rac.getBrowserFields.mockResolvedValue({ browserFields: {}, fields: [] });

    getBrowserFieldsByFeatureId(server.router);
  });

  test('route registered', async () => {
    const response = await server.inject(getO11yBrowserFields(), context);

    expect(response.status).toEqual(200);
  });

  test('it calls getAuthorizedAlertsIndices with o11y rule types', async () => {
    const response = await server.inject(getO11yBrowserFields(), context);

    expect(response.status).toEqual(200);
    expect(clients.rac.getAuthorizedAlertsIndices).toHaveBeenCalledWith([
      'apm.anomaly',
      'logs.alert.document.count',
    ]);
  });

  test('it calls getAuthorizedAlertsIndices only for o11y rule types when siem rule types are mixed', async () => {
    const response = await server.inject(
      {
        ...getO11yBrowserFields(),
        query: { ruleTypeIds: ['apm.anomaly', 'siem.esqlRuleType'] },
      },
      context
    );

    expect(response.status).toEqual(200);
    expect(clients.rac.getAuthorizedAlertsIndices).toHaveBeenCalledWith(['apm.anomaly']);
  });

  test('it does not call getAuthorizedAlertsIndices with siem rule types', async () => {
    const response = await server.inject(
      {
        ...getO11yBrowserFields(),
        query: { ruleTypeIds: ['siem.esqlRuleType'] },
      },
      context
    );

    expect(response.status).toEqual(200);
    expect(clients.rac.getAuthorizedAlertsIndices).not.toHaveBeenCalledWith();
  });

  test('accepts an array of string ', async () => {
    const ruleTypeIds = ['foo', 'bar'];

    await server.inject({ ...getO11yBrowserFields(), query: { ruleTypeIds } }, context);

    expect(clients.rac.getAuthorizedAlertsIndices).toHaveBeenCalledWith(ruleTypeIds);
  });

  test('accepts a single string', async () => {
    const ruleTypeIds = 'foo';

    await server.inject({ ...getO11yBrowserFields(), query: { ruleTypeIds } }, context);

    expect(clients.rac.getAuthorizedAlertsIndices).toHaveBeenCalledWith([ruleTypeIds]);
  });

  test('returns 404 when getAuthorizedAlertsIndices returns an empty array', async () => {
    clients.rac.getAuthorizedAlertsIndices.mockResolvedValue([]);

    const response = await server.inject(getO11yBrowserFields(), context);

    expect(response.status).toEqual(404);
  });

  test('rejects invalid ruleTypeIds', async () => {
    await expect(
      server.inject(
        requestMock.create({
          method: 'get',
          path,
          query: { ruleTypeIds: undefined },
        }),
        context
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"ruleTypeIds\\"'"`
    );
  });

  test('returns error status if rac client "getAuthorizedAlertsIndices" fails', async () => {
    clients.rac.getAuthorizedAlertsIndices.mockRejectedValue(new Error('Unable to get index'));
    const response = await server.inject(getO11yBrowserFields(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Unable to get index',
    });
  });
});
