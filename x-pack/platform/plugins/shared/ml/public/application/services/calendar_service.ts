/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MlCalendar, MlCalendarId } from '../../../common/types/calendars';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlApi } from './ml_api_service';

class CalendarService {
  /**
   * Assigns a job id to the calendar.
   * @param calendar
   * @param jobId
   */
  async assignNewJobId(mlApi: MlApi, calendar: MlCalendar, jobId: JobId) {
    const { calendar_id: calendarId } = calendar;
    try {
      await mlApi.updateCalendar({
        ...calendar,
        calendarId,
        job_ids: [...calendar.job_ids, jobId],
      });
    } catch (e) {
      throw new Error(
        i18n.translate('xpack.ml.calendarService.assignNewJobIdErrorMessage', {
          defaultMessage: 'Unable to assign {jobId} to {calendarId}',
          values: { calendarId, jobId },
        })
      );
    }
  }

  /**
   * Fetches calendars by the list of ids.
   * @param calendarIds
   */
  async fetchCalendarsByIds(mlApi: MlApi, calendarIds: MlCalendarId[]): Promise<MlCalendar[]> {
    try {
      const calendars = await mlApi.calendars({ calendarIds });
      return Array.isArray(calendars) ? calendars : [calendars];
    } catch (e) {
      throw new Error(
        i18n.translate('xpack.ml.calendarService.fetchCalendarsByIdsErrorMessage', {
          defaultMessage: 'Unable to fetch calendars: {calendarIds}',
          values: { calendarIds: calendarIds.join(', ') },
        })
      );
    }
  }
}

export const mlCalendarService = new CalendarService();
