/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { toastNotifications } from 'ui/notify';
import { MarkdownSimple } from '../../../../../../../src/legacy/core_plugins/kibana_react/public';
import { PLUGIN } from '../../../common/constants';

export class LogstashLicenseService {
  constructor(xpackInfoService, kbnUrlService, $timeout) {
    this.xpackInfoService = xpackInfoService;
    this.kbnUrlService = kbnUrlService;
    this.$timeout = $timeout;
  }

  get enableLinks() {
    return Boolean(this.xpackInfoService.get(`features.${PLUGIN.ID}.enableLinks`));
  }

  get isAvailable() {
    return Boolean(this.xpackInfoService.get(`features.${PLUGIN.ID}.isAvailable`));
  }

  get isReadOnly() {
    return Boolean(this.xpackInfoService.get(`features.${PLUGIN.ID}.isReadOnly`));
  }

  get message() {
    return this.xpackInfoService.get(`features.${PLUGIN.ID}.message`);
  }

  notifyAndRedirect() {
    toastNotifications.addDanger({
      title: (
        <MarkdownSimple>
          {this.xpackInfoService.get(`features.${PLUGIN.ID}.message`)}
        </MarkdownSimple>
      ),
    });
    this.kbnUrlService.redirect('/management');
  }

  /**
   * Checks if the license is valid or the license can perform downgraded UI tasks.
   * Otherwise, notifies and redirects.
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
}
