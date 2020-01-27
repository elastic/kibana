/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export class EventManager {
  private isLegacy: boolean;
  private client: any;
  constructor(isLegacy: boolean, client: any) {
    this.isLegacy = isLegacy;
    this.client = client;
  }

  async getCalendarEvents(calendarId: string) {
    try {
      let resp;
      if (this.isLegacy === true) {
        resp = await this.client('ml.events', { calendarId });
      } else {
        resp = await this.client.ml!.mlClient.callAsCurrentUser('ml.events', { calendarId });
      }
      return resp.events;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  // jobId is optional
  async getAllEvents(jobId?: string) {
    const calendarId = '_all';
    try {
      let resp;
      if (this.isLegacy === true) {
        resp = await this.client('ml.events', {
          calendarId,
          jobId,
        });
      } else {
        resp = await this.client.ml!.mlClient.callAsCurrentUser('ml.events', {
          calendarId,
          jobId,
        });
      }

      return resp.events;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async addEvents(calendarId: string, events: any) {
    const body = { events };

    try {
      if (this.isLegacy === true) {
        return await this.client('ml.addEvent', {
          calendarId,
          body,
        });
      }
      return await this.client.ml!.mlClient.callAsCurrentUser('ml.addEvent', { calendarId, body });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    if (this.isLegacy === true) {
      return this.client('ml.deleteEvent', { calendarId, eventId });
    }

    return this.client.ml!.mlClient.callAsCurrentUser('ml.deleteEvent', { calendarId, eventId });
  }

  isEqual(ev1: any, ev2: any) {
    return (
      ev1.event_id === ev2.event_id &&
      ev1.description === ev2.description &&
      ev1.start_time === ev2.start_time &&
      ev1.end_time === ev2.end_time
    );
  }
}
