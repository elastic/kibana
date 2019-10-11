/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpServiceBase } from 'src/core/public';

import { Storage } from 'src/legacy/core_plugins/data/public/types';
import { LensClickEvent, BASE_API_URL } from '../../common';

const STORAGE_KEY = 'lens-ui-telemetry';

export class LensReportManager {
  private clicks: LensClickEvent[];
  private suggestionClicks: LensClickEvent[];

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
    this.clicks = unsent && unsent.clicks ? unsent.clicks : [];
    this.suggestionClicks = unsent && unsent.suggestionClicks ? unsent.suggestionClicks : [];

    this.timer = setInterval(() => {
      if (this.clicks.length || this.suggestionClicks.length) {
        this.postToServer();
      }
    }, 10000);
  }

  public trackEvent(name: string) {
    this.clicks.push({
      name,
      date: new Date().toISOString(),
    });
    this.write();
  }

  public trackSuggestionEvent(name: string) {
    this.suggestionClicks.push({
      name,
      date: new Date().toISOString(),
    });
    this.write();
  }

  private write() {
    this.storage.set(STORAGE_KEY, { clicks: this.clicks, suggestionClicks: this.suggestionClicks });
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async postToServer() {
    try {
      await this.http.post(`${this.basePath}${BASE_API_URL}/telemetry`, {
        body: JSON.stringify({
          clicks: this.clicks,
          suggestionClicks: this.suggestionClicks,
        }),
      });
      this.clicks = [];
      this.suggestionClicks = [];
      this.write();
    } catch (e) {
      // Maybe show an error
      console.log(e);
    }
  }
}

let reportManager: LensReportManager;

export function setReportManager(newManager: LensReportManager) {
  reportManager = newManager;
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
