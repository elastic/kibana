/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { toastNotifications } from 'ui/notify';
import { MarkdownSimple } from 'ui/markdown';
import chrome from 'ui/chrome';
import { PLUGIN, ROUTES } from '../../../common/constants';

export class LicenseService {
  constructor(xpackInfoService, kbnUrlService, $timeout, $http) {
    this.$http = $http;
    this.xpackInfoService = xpackInfoService;
    this.kbnUrlService = kbnUrlService;
    this.$timeout = $timeout;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  get showLinks() {
    return Boolean(this.xpackInfoService.get(`features.${PLUGIN.ID}.showLinks`));
  }

  get enableLinks() {
    return Boolean(this.xpackInfoService.get(`features.${PLUGIN.ID}.enableLinks`));
  }

  get isAvailable() {
    return Boolean(this.xpackInfoService.get(`features.${PLUGIN.ID}.isAvailable`));
  }

  get message() {
    return this.xpackInfoService.get(`features.${PLUGIN.ID}.message`);
  }

  notifyAndRedirect() {
    toastNotifications.addDanger({
      title: <MarkdownSimple>{this.xpackInfoService.get(`features.${PLUGIN.ID}.message`)}</MarkdownSimple>,
    });
    this.kbnUrlService.redirect('/management');
  }

  /**
   * @param opts Object options
   * @param opts.onValid Function To execute when license is valid. Optional; default = noop
   * @param opts.onInvalid Function To execute when license is invalid. Optional; default = noop
   */
  checkValidity() {
    return new Promise((resolve, reject) => {
      this.$timeout(() => {
        if (this.isAvailable) {
          return resolve();
        }

        this.notifyAndRedirect();
        return reject();
      }, 10); // To allow latest XHR call to update license info
    });
  }

  refreshLicense() {
    return this.$http.get(`${this.basePath}/license/refresh`)
      .then(response => {
        return response.data.success;
      });
  }
}
