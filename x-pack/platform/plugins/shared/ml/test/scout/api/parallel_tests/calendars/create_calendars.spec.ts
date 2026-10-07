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
} from '../../fixtures/calendar_helpers';

const CALENDAR_ID = 'test_create_calendar';

const REQUEST_BODY = {
  calendarId: CALENDAR_ID,
  job_ids: ['test_job_1', 'test_job_2'],
  description: 'Test calendar',
  events: [...TEST_CALENDAR_EVENTS],
};

// setKibanaTimeZoneToUTC() is intentionally omitted. Investigation findings:
// - FTR tests DO call setKibanaTimeZoneToUTC() but only as defensive setup (added 2020, reason unclear)
// - Calendar API stores/returns raw epoch milliseconds, independent of timezone
// - Assertions compare timestamps as numbers, not formatted dates
// - The 'dateFormat:tz' UI setting is only used in public explorer UI, not calendar API
// - Similar API-only tests (filters, saved_objects) don't set timezone
// If test failures occur, timezone may need to be set for environment consistency.

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'ML Calendar - create',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.delete(CALENDAR_ID);
    });

    apiTest(
      'should successfully create calendar by id',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        const response = await apiClient.put('internal/ml/calendars', {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          body: REQUEST_BODY,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const calendar = await apiServices.ml.anomalyDetection.calendars.get(CALENDAR_ID);
        expect(calendar.calendar_id).toBe(REQUEST_BODY.calendarId);
        expect(calendar.description).toBe(REQUEST_BODY.description);
        expect(calendar.job_ids).toStrictEqual(REQUEST_BODY.job_ids);
        assertAllEventsExistInCalendar(TEST_CALENDAR_EVENTS, calendar);
      }
    );

    apiTest(
      'should not create calendar for user without required permission',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();
        const response = await apiClient.put('internal/ml/calendars', {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          body: REQUEST_BODY,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
        expect(response.body.error).toBe('Forbidden');

        await apiTest.step('verify calendar was not created', async () => {
          const { cookieHeader: poweruserCookieHeader } = await samlAuth.asMlPoweruser();
          const getResponse = await apiClient.get(`internal/ml/calendars/${CALENDAR_ID}`, {
            headers: { ...poweruserCookieHeader, ...INTERNAL_API_HEADERS },
            responseType: 'json',
          });
          expect(getResponse).toHaveStatusCode(404);
        });
      }
    );

    apiTest('should not create calendar for unauthorized user', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlUnauthorized();
      const response = await apiClient.put('internal/ml/calendars', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        body: REQUEST_BODY,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
      expect(response.body.error).toBe('Forbidden');

      await apiTest.step('verify calendar was not created', async () => {
        const { cookieHeader: poweruserCookieHeader } = await samlAuth.asMlPoweruser();
        const getResponse = await apiClient.get(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...poweruserCookieHeader, ...INTERNAL_API_HEADERS },
          responseType: 'json',
        });
        expect(getResponse).toHaveStatusCode(404);
      });
    });
  }
);
