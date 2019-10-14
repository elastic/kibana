/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { HttpServiceBase } from 'src/core/public';

import { Storage } from 'src/legacy/core_plugins/data/public/types';
import { BASE_API_URL } from '../../common';

const STORAGE_KEY = 'lens-ui-telemetry';

let reportManager: LensReportManager;

export function setReportManager(newManager: LensReportManager) {
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
  private clicks: Record<string, LensClickEvent>;
  private suggestionClicks: Record<string, LensClickEvent>;

  private storage: Storage;
  private http: HttpServiceBase;
  private basePath: string;
  private timer: ReturnType<typeof setInterval>;

  constructor({
    storage,
    http,
    basePath,
  }: {
    storage: Storage;
    http: HttpServiceBase;
    basePath: string;
  }) {
    this.storage = storage;
    this.http = http;
    this.basePath = basePath;

    const unsent = this.storage.get(STORAGE_KEY);
    this.clicks = unsent && unsent.clicks ? unsent.clicks : {};
    this.suggestionClicks = unsent && unsent.suggestionClicks ? unsent.suggestionClicks : {};

    this.timer = setInterval(() => {
      this.postToServer();
    }, 10000);
  }

  public trackEvent(name: string) {
    this.trackTo(this.clicks, name);
  }

  public trackSuggestionEvent(name: string) {
    this.trackTo(this.suggestionClicks, name);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async postToServer() {
    if (Object.keys(this.clicks).length || Object.keys(this.suggestionClicks).length) {
      try {
        await this.http.post(`${this.basePath}${BASE_API_URL}/telemetry`, {
          body: JSON.stringify({
            clicks: this.clicks,
            suggestionClicks: this.suggestionClicks,
          }),
        });
        this.clicks = {};
        this.suggestionClicks = {};
        this.write();
      } catch (e) {
        // Silent error because events will be reported during the next timer
      }
    }
  }

  private trackTo(target: Record<string, Record<string, number>>, name: string) {
    const date = moment().format('YYYY-MM-DD');
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
    this.storage.set(STORAGE_KEY, { clicks: this.clicks, suggestionClicks: this.suggestionClicks });
  }
}
