/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

export class XpackWatcherTimezoneService {
  constructor(config) {
    this.config = config;
  }

  getTimezone() {
    const DATE_FORMAT_CONFIG_KEY = 'dateFormat:tz';
    const isCustomTimezone = !this.config.isDefault(DATE_FORMAT_CONFIG_KEY);
    if (isCustomTimezone) {
      return this.config.get(DATE_FORMAT_CONFIG_KEY);
    }

    const detectedTimezone = moment.tz.guess();
    if (detectedTimezone) {
      return detectedTimezone;
    }

    const tzOffset = moment().format('Z');
    return tzOffset;
  }
}


