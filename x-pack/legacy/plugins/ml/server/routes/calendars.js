/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { CalendarManager } from '../models/calendar';

function getAllCalendars(callWithRequest) {
  const cal = new CalendarManager(callWithRequest);
  return cal.getAllCalendars();
}

function getCalendar(callWithRequest, calendarId) {
  const cal = new CalendarManager(callWithRequest);
  return cal.getCalendar(calendarId);
}

function newCalendar(callWithRequest, calendar) {
  const cal = new CalendarManager(callWithRequest);
  return cal.newCalendar(calendar);
}

function updateCalendar(callWithRequest, calendarId, calendar) {
  const cal = new CalendarManager(callWithRequest);
  return cal.updateCalendar(calendarId, calendar);
}

function deleteCalendar(callWithRequest, calendarId) {
  const cal = new CalendarManager(callWithRequest);
  return cal.deleteCalendar(calendarId);
}

function getCalendarsByIds(callWithRequest, calendarIds) {
  const cal = new CalendarManager(callWithRequest);
  return cal.getCalendarsByIds(calendarIds);
}

export function calendars({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/calendars',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return getAllCalendars(callWithRequest).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/calendars/{calendarIds}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const calendarIds = request.params.calendarIds.split(',');
      if (calendarIds.length === 1) {
        return getCalendar(callWithRequest, calendarIds[0]).catch(resp => wrapError(resp));
      } else {
        return getCalendarsByIds(callWithRequest, calendarIds).catch(resp => wrapError(resp));
      }
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/calendars',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const body = request.payload;
      return newCalendar(callWithRequest, body).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/calendars/{calendarId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const calendarId = request.params.calendarId;
      const body = request.payload;
      return updateCalendar(callWithRequest, calendarId, body).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'DELETE',
    path: '/api/ml/calendars/{calendarId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const calendarId = request.params.calendarId;
      return deleteCalendar(callWithRequest, calendarId).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
