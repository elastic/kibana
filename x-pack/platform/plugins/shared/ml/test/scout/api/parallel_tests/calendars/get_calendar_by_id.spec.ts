/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import {
  assertAllEventsExistInCalendar,
  TEST_CALENDAR_EVENTS,
  type MlCalendar,
} from '../../fixtures/calendar_helpers';

const CALENDAR_ID = 'test_get_cal';

const TEST_CALENDAR = {
  calendar_id: CALENDAR_ID,
  job_ids: ['test_job_1', 'test_job_2'],
  description: 'Test calendar',
};

apiTest.describe(
  'ML Calendar - get by id',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.create(CALENDAR_ID, {
        job_ids: TEST_CALENDAR.job_ids,
        description: TEST_CALENDAR.description,
      });
      await apiServices.ml.anomalyDetection.calendars.createCalendarEvents(CALENDAR_ID, [
        ...TEST_CALENDAR_EVENTS,
      ]);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.delete(CALENDAR_ID);
    });

    apiTest(
      'should fetch calendar and associated events by id as poweruser',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        const response = await apiClient.get(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const body = response.body as MlCalendar;
        expect(body.job_ids).toStrictEqual(TEST_CALENDAR.job_ids);
        expect(body.description).toBe(TEST_CALENDAR.description);
        expect(body.events).toHaveLength(TEST_CALENDAR_EVENTS.length);
        assertAllEventsExistInCalendar(TEST_CALENDAR_EVENTS, body);
      }
    );

    apiTest(
      'should fetch calendar and associated events by id as viewer',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();
        const response = await apiClient.get(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const body = response.body as MlCalendar;
        expect(body.job_ids).toStrictEqual(TEST_CALENDAR.job_ids);
        expect(body.description).toBe(TEST_CALENDAR.description);
        expect(body.events).toHaveLength(TEST_CALENDAR_EVENTS.length);
        assertAllEventsExistInCalendar(TEST_CALENDAR_EVENTS, body);
      }
    );

    apiTest('should not fetch calendar for unauthorized user', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlUnauthorized();
      const response = await apiClient.get(`internal/ml/calendars/${CALENDAR_ID}`, {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
      expect(response.body.error).toBe('Forbidden');
    });

    apiTest('should return 404 for a non-existent calendar id', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const response = await apiClient.get('internal/ml/calendars/calendar_id_dne', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.error).toBe('Not Found');
    });
  }
);
