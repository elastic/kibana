/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { HttpSetup } from 'src/core/public';

import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { BASE_API_URL } from '../../common';

const STORAGE_KEY = 'lens-ui-telemetry';

let reportManager: LensReportManager;

export function setReportManager(newManager: LensReportManager) {
  if (reportManager) {
    reportManager.stop();
  }
  reportManager = newManager;
}

export function stopReportManager() {
  if (reportManager) {
    reportManager.stop();
  }
}

export function trackUiEvent(name: string) {
  if (reportManager) {
    reportManager.trackEvent(name);
  }
}

export function trackSuggestionEvent(name: string) {
  if (reportManager) {
    reportManager.trackSuggestionEvent(name);
  }
}

export class LensReportManager {
  private events: Record<string, Record<string, number>> = {};
  private suggestionEvents: Record<string, Record<string, number>> = {};

  private storage: IStorageWrapper;
  private http: HttpSetup;
  private timer: ReturnType<typeof setInterval>;

  constructor({ storage, http }: { storage: IStorageWrapper; http: HttpSetup }) {
    this.storage = storage;
    this.http = http;

    this.readFromStorage();

    this.timer = setInterval(() => {
      this.postToServer();
    }, 10000);
  }

  public trackEvent(name: string) {
    this.readFromStorage();
    this.trackTo(this.events, name);
  }

  public trackSuggestionEvent(name: string) {
    this.readFromStorage();
    this.trackTo(this.suggestionEvents, name);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private readFromStorage() {
    const data = this.storage.get(STORAGE_KEY);
    if (data && typeof data.events === 'object' && typeof data.suggestionEvents === 'object') {
      this.events = data.events;
      this.suggestionEvents = data.suggestionEvents;
    }
  }

  private async postToServer() {
    this.readFromStorage();
    if (Object.keys(this.events).length || Object.keys(this.suggestionEvents).length) {
      try {
        await this.http.post(`${BASE_API_URL}/telemetry`, {
          body: JSON.stringify({
            events: this.events,
            suggestionEvents: this.suggestionEvents,
          }),
        });
        this.events = {};
        this.suggestionEvents = {};
        this.write();
      } catch (e) {
        // Silent error because events will be reported during the next timer
      }
    }
  }

  private trackTo(target: Record<string, Record<string, number>>, name: string) {
    const date = moment()
      .utc()
      .format('YYYY-MM-DD');
    if (!target[date]) {
      target[date] = {
        [name]: 1,
      };
    } else if (!target[date][name]) {
      target[date][name] = 1;
    } else {
      target[date][name] += 1;
    }

    this.write();
  }

  private write() {
    this.storage.set(STORAGE_KEY, { events: this.events, suggestionEvents: this.suggestionEvents });
  }
}
