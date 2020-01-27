/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { checkLicense } from './check_license';
import { LICENSE_TYPE_STANDARD, LICENSE_STATUS_VALID } from '../../common/constants';

const FEATURE = {
  ID: 'audit_logging',
};

export class AuditLogger {
  constructor(server, pluginId, config, xPackInfo) {
    this._server = server;
    this._pluginId = pluginId;
    this._enabled =
      config.get('xpack.security.enabled') && config.get('xpack.security.audit.enabled');
    this._licensed = false;
    this._checkLicense = xPackInfo => {
      this._licensed =
        checkLicense(FEATURE.ID, LICENSE_TYPE_STANDARD, xPackInfo).status === LICENSE_STATUS_VALID;
    };
    xPackInfo
      .feature(`${FEATURE.ID}-${pluginId}`)
      .registerLicenseCheckResultsGenerator(this._checkLicense);
    this._checkLicense(xPackInfo);
  }

  log(eventType, message, data = {}) {
    if (!this._licensed || !this._enabled) {
      return;
    }

    this._server.logWithMetadata(['info', 'audit', this._pluginId, eventType], message, {
      ...data,
      eventType,
    });
  }
}
