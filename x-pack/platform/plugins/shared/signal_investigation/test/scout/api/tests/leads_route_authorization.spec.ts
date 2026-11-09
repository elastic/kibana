/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { LOG_CHANGE_POINTS_ANALYSIS_WINDOW, generateLogChangePointsData } from '@kbn/synthtrace';
import { APM_WITHOUT_ML_ROLE, INTERNAL_HEADERS, LOGS_ONLY_ROLE, apiTest } from '../fixtures';

const SEED_BODY = {
  origin: { app: 'discover', surface: 'appMenu' },
  timeRange: {
    from: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.start,
    to: LOG_CHANGE_POINTS_ANALYSIS_WINDOW.end,
  },
  filters: [],
  entities: { 'service.name': 'test-service' },
};

apiTest.describe(
  'Signal investigation leads route authorization',
  { tag: tags.stateful.classic },
  () => {
    let logsOnlyHeaders: Record<string, string>;
    let apmWithoutMlHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, logsSynthtraceEsClient }) => {
      const [logsOnlyAuth, apmWithoutMlAuth] = await Promise.all([
        samlAuth.asInteractiveUser(LOGS_ONLY_ROLE),
        samlAuth.asInteractiveUser(APM_WITHOUT_ML_ROLE),
      ]);
      logsOnlyHeaders = { ...INTERNAL_HEADERS, ...logsOnlyAuth.cookieHeader };
      apmWithoutMlHeaders = { ...INTERNAL_HEADERS, ...apmWithoutMlAuth.cookieHeader };

      const { generator } = generateLogChangePointsData({
        logsEsClient: logsSynthtraceEsClient as never,
      });
      await logsSynthtraceEsClient.index(generator);
    });

    apiTest.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns log change-point leads to a logs-only user while rejecting APM routes with 403',
      async ({ apiClient }) => {
        const logResponse = await apiClient.post(
          'internal/signal_investigation/leads/log_change_points',
          {
            headers: logsOnlyHeaders,
            body: SEED_BODY,
            responseType: 'json',
          }
        );

        expect(logResponse).toHaveStatusCode(200);
        expect(logResponse.body).toMatchObject({
          status: 'found',
          leads: expect.arrayContaining([
            expect.objectContaining({
              analyzerId: 'log_change_points',
            }),
          ]),
        });

        const serviceResponse = await apiClient.post(
          'internal/signal_investigation/leads/service_change_points',
          {
            headers: logsOnlyHeaders,
            body: SEED_BODY,
            responseType: 'json',
          }
        );
        expect(serviceResponse).toHaveStatusCode(403);

        const dependencyResponse = await apiClient.post(
          'internal/signal_investigation/leads/dependency_change_points',
          {
            headers: logsOnlyHeaders,
            body: SEED_BODY,
            responseType: 'json',
          }
        );
        expect(dependencyResponse).toHaveStatusCode(403);
      }
    );

    apiTest(
      'returns 403 from the service_anomalies route when the user lacks ml:canGetJobs',
      async ({ apiClient }) => {
        const anomaliesResponse = await apiClient.post(
          'internal/signal_investigation/leads/service_anomalies',
          {
            headers: apmWithoutMlHeaders,
            body: SEED_BODY,
            responseType: 'json',
          }
        );

        expect(anomaliesResponse).toHaveStatusCode(403);
      }
    );
  }
);
