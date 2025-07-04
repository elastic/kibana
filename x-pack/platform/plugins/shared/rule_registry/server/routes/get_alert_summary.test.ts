/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { getAlertSummaryRoute } from './get_alert_summary';
import { requestContextMock } from './__mocks__/request_context';
import { requestMock, serverMock } from './__mocks__/server';

describe('getAlertSummaryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.getAlertSummary.mockResolvedValue({
      activeAlertCount: 0,
      recoveredAlertCount: 0,
      activeAlerts: [],
      recoveredAlerts: [],
    });

    getAlertSummaryRoute(server.router);
  });

  describe('request validation', () => {
    test('rejects invalid query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
            body: { gte: 4, lte: 3, ruleTypeIds: ['logs'] },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"4\\" supplied to \\"gte\\",Invalid value \\"3\\" supplied to \\"lte\\"'"`
      );
    });

    test('validate gte/lte format', async () => {
      const resp = await server.inject(
        requestMock.create({
          method: 'post',
          path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
          body: {
            gte: '2020-12-16T15:00:00.000Z',
            lte: '2020-12-16',
            ruleTypeIds: ['logs'],
          },
        }),
        context
      );
      expect(resp.status).toEqual(400);
      expect(resp.body).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "success": false,
          },
          "message": "gte and/or lte are not following the UTC format",
        }
      `);
    });

    test('validate fixed_interval ', async () => {
      const resp = await server.inject(
        requestMock.create({
          method: 'post',
          path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
          body: {
            gte: '2020-12-16T15:00:00.000Z',
            lte: '2020-12-16T16:00:00.000Z',
            ruleTypeIds: ['logs'],
            fixed_interval: 'xx',
          },
        }),
        context
      );
      expect(resp.status).toEqual(400);
      expect(resp.body).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "success": false,
          },
          "message": "fixed_interval (value: xx) is not following the expected format 1s, 1m, 1h, 1d with at most 6 digits",
        }
      `);
    });

    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
            body: {
              gte: '2020-12-16T15:00:00.000Z',
              lte: '2020-12-16T16:00:00.000Z',
              ruleTypeIds: ['logs'],
              boop: 'unknown',
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"boop\\"'"`
      );
    });

    test('rejects without ruleTypeIds', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
            body: {
              gte: '2020-12-16T15:00:00.000Z',
              lte: '2020-12-16T16:00:00.000Z',
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"ruleTypeIds\\"'"`
      );
    });

    test('accepts consumers', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
            body: {
              gte: '2020-12-16T15:00:00.000Z',
              lte: '2020-12-16T16:00:00.000Z',
              consumers: ['foo'],
              ruleTypeIds: ['bar'],
            },
          }),
          context
        )
      ).resolves.not.toThrow();
    });

    test('calls the alerts client correctly', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_alert_summary`,
            body: {
              gte: '2020-12-16T15:00:00.000Z',
              lte: '2020-12-16T16:00:00.000Z',
              consumers: ['foo'],
              ruleTypeIds: ['bar'],
            },
          }),
          context
        )
      ).resolves.not.toThrow();

      expect(clients.rac.getAlertSummary).toHaveBeenCalledWith({
        consumers: ['foo'],
        filter: undefined,
        fixedInterval: undefined,
        gte: '2020-12-16T15:00:00.000Z',
        lte: '2020-12-16T16:00:00.000Z',
        ruleTypeIds: ['bar'],
      });
    });
  });
});
