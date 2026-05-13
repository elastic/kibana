/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { TEST_CALENDAR_EVENTS } from '../../fixtures/calendar_helpers';

const CALENDAR_ID = 'test_delete_cal';

const TEST_CALENDAR = {
  job_ids: ['test_job_1', 'test_job_2'],
  description: 'Test calendar',
};

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'ML Calendar - delete',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.createCalendar(CALENDAR_ID, TEST_CALENDAR);
      await apiServices.ml.anomalyDetection.calendars.createCalendarEvents(CALENDAR_ID, [
        ...TEST_CALENDAR_EVENTS,
      ]);
    });

    // deleteCalendar uses ignoreErrors: [404] — safe when the success test already deleted it
    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.delete(CALENDAR_ID);
    });

    apiTest('should delete calendar by id', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const response = await apiClient.delete(`internal/ml/calendars/${CALENDAR_ID}`, {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.acknowledged).toBe(true);
    });

    apiTest(
      'should not delete calendar for user without required permission',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();
        const response = await apiClient.delete(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
        expect(response.body.error).toBe('Forbidden');

        // Security check: confirm the calendar was NOT deleted despite the 403
        const calendar = await apiServices.ml.anomalyDetection.calendars.get(CALENDAR_ID);
        expect(calendar.calendar_id).toBe(CALENDAR_ID);
      }
    );

    apiTest(
      'should not delete calendar for unauthorized user',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlUnauthorized();
        const response = await apiClient.delete(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
        expect(response.body.error).toBe('Forbidden');

        // Security check: confirm the calendar was NOT deleted despite the 403
        const calendar = await apiServices.ml.anomalyDetection.calendars.get(CALENDAR_ID);
        expect(calendar.calendar_id).toBe(CALENDAR_ID);
      }
    );

    apiTest('should return 404 for a non-existent calendar id', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const response = await apiClient.delete('internal/ml/calendars/calendar_id_dne', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.error).toBe('Not Found');
    });
  }
);
