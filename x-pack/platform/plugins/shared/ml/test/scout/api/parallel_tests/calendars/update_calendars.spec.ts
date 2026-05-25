/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';
import { assertAllEventsExistInCalendar } from '../../fixtures/calendar_helpers';

const CALENDAR_ID = 'test_update_cal';

const ORIGINAL_CALENDAR = {
  job_ids: ['test_job_1'],
  description: 'Test calendar',
};

const ORIGINAL_EVENTS = [
  { description: 'event 1', start_time: 1513641600000, end_time: 1513728000000 },
];

const UPDATE_REQUEST_BODY = {
  calendarId: CALENDAR_ID,
  job_ids: ['test_updated_job_1', 'test_updated_job_2'],
  description: 'Updated calendar #1',
  events: [
    { description: 'updated event 2', start_time: 1513814400000, end_time: 1513900800000 },
    { description: 'updated event 3', start_time: 1514160000000, end_time: 1514246400000 },
  ],
};

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'ML Calendar - update',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.create(CALENDAR_ID, ORIGINAL_CALENDAR);
      await apiServices.ml.anomalyDetection.calendars.createCalendarEvents(
        CALENDAR_ID,
        ORIGINAL_EVENTS
      );
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.ml.anomalyDetection.calendars.delete(CALENDAR_ID);
    });

    apiTest(
      'should update calendar by id with new settings',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        const response = await apiClient.put(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          body: UPDATE_REQUEST_BODY,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        // Verify persisted state via elevated-privilege service calls (side-effect check)
        const calendar = await apiServices.ml.anomalyDetection.calendars.get(CALENDAR_ID);
        expect(calendar.calendar_id).toBe(UPDATE_REQUEST_BODY.calendarId);
        expect(calendar.job_ids).toHaveLength(UPDATE_REQUEST_BODY.job_ids.length);

        const { events } = await apiServices.ml.anomalyDetection.calendars.getCalendarEvents(
          CALENDAR_ID
        );
        expect(events).toHaveLength(UPDATE_REQUEST_BODY.events.length);
        assertAllEventsExistInCalendar(UPDATE_REQUEST_BODY.events, { events });
      }
    );

    apiTest(
      'should not allow updating a calendar for user without required permission',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();
        const response = await apiClient.put(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          body: UPDATE_REQUEST_BODY,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
        expect(response.body.error).toBe('Forbidden');

        // Verify calendar was not modified despite the 403
        const calendar = await apiServices.ml.anomalyDetection.calendars.get(CALENDAR_ID);
        expect(calendar.description).toBe(ORIGINAL_CALENDAR.description);
        expect(calendar.job_ids).toStrictEqual(ORIGINAL_CALENDAR.job_ids);
      }
    );

    apiTest(
      'should not allow updating a calendar for unauthorized user',
      async ({ apiClient, apiServices, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlUnauthorized();
        const response = await apiClient.put(`internal/ml/calendars/${CALENDAR_ID}`, {
          headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
          body: UPDATE_REQUEST_BODY,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
        expect(response.body.error).toBe('Forbidden');

        // Verify calendar was not modified despite the 403
        const calendar = await apiServices.ml.anomalyDetection.calendars.get(CALENDAR_ID);
        expect(calendar.description).toBe(ORIGINAL_CALENDAR.description);
        expect(calendar.job_ids).toStrictEqual(ORIGINAL_CALENDAR.job_ids);
      }
    );

    apiTest('should return 404 for a non-existent calendar id', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const response = await apiClient.put('internal/ml/calendars/calendar_id_dne', {
        headers: { ...cookieHeader, ...INTERNAL_API_HEADERS },
        body: UPDATE_REQUEST_BODY,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.error).toBe('Not Found');
    });
  }
);
