/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';
import { Settings } from 'plugins/watcher/models/settings';

export class SettingsService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  getSettings() {
    return this.$http.get(`${this.basePath}/settings`)
      .then(response => {
        return Settings.fromUpstreamJson(response.data);
      });
  }
}
