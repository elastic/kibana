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

const TEST_CALENDARS = [
  {
    calendar_id: 'test_get_cal_1',
    job_ids: ['test_job_1', 'test_job_2'],
    description: 'Test calendar 1',
  },
  {
    calendar_id: 'test_get_cal_2',
    job_ids: ['test_job_1', 'test_job_2'],
    description: 'Test calendar 2',
  },
  {
    calendar_id: 'test_get_cal_3',
    job_ids: ['test_job_1', 'test_job_2'],
    description: 'Test calendar 3',
  },
] as const;

const TEST_CALENDAR_IDS = TEST_CALENDARS.map((c) => c.calendar_id);

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'ML Calendar - get all',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    apiTest.beforeEach(async ({ apiServices }) => {
      for (const cal of TEST_CALENDARS) {
        await apiServices.ml.anomalyDetection.calendars.createCalendar(cal.calendar_id, {
          job_ids: [...cal.job_ids],
          description: cal.description,
        });
        await apiServices.ml.anomalyDetection.calendars.createCalendarEvents(cal.calendar_id, [
          ...TEST_CALENDAR_EVENTS,
        ]);
      }
    });

    apiTest.afterEach(async ({ apiServices }) => {
      for (const calendarId of TEST_CALENDAR_IDS) {
        await apiServices.ml.anomalyDetection.calendars.delete(calendarId);
      }
    });

    apiTest('should fetch all calendars as poweruser', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const response = await apiClient.get('internal/ml/calendars', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as MlCalendar[];
      expect(body.length).toBeGreaterThan(TEST_CALENDARS.length - 1);
      const returnedIds = body.map((c) => c.calendar_id);
      expect(returnedIds).toStrictEqual(expect.arrayContaining(TEST_CALENDAR_IDS));

      const cal1 = body.find((c) => c.calendar_id === 'test_get_cal_1');
      expect(cal1).toBeDefined();
      expect(cal1?.events).toHaveLength(TEST_CALENDAR_EVENTS.length);
      assertAllEventsExistInCalendar(TEST_CALENDAR_EVENTS, { events: cal1?.events ?? [] });
    });

    apiTest('should fetch all calendars as viewer', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlViewer();
      const response = await apiClient.get('internal/ml/calendars', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as MlCalendar[];
      expect(body.length).toBeGreaterThan(TEST_CALENDARS.length - 1);
      const returnedIds = body.map((c) => c.calendar_id);
      expect(returnedIds).toStrictEqual(expect.arrayContaining(TEST_CALENDAR_IDS));
    });

    apiTest('should not fetch calendars for unauthorized user', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlUnauthorized();
      const response = await apiClient.get('internal/ml/calendars', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
      expect(response.body.error).toBe('Forbidden');
    });
  }
);
