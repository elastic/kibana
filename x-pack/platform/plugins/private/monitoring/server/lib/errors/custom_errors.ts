/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */
import { i18n } from '@kbn/i18n';
import { boomify } from '@hapi/boom';
import { ErrorTypes } from '../../types';

export class MonitoringCustomError extends Error {
  readonly description?: string;
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}
export class MonitoringLicenseError extends MonitoringCustomError {
  readonly description: string;
  constructor(clusterId: string) {
    super();
    this.message = i18n.translate('xpack.monitoring.errors.monitoringLicenseErrorTitle', {
      defaultMessage: 'Monitoring License Error',
    });
    this.description = i18n.translate('xpack.monitoring.errors.monitoringLicenseErrorDescription', {
      defaultMessage:
        "Could not find license information for cluster = ''{clusterId}''. " +
        "Please check the cluster's master node server logs for errors or warnings.",
      values: {
        clusterId,
      },
    });
  }
}

export function isCustomError(err: ErrorTypes) {
  if (err instanceof MonitoringCustomError) {
    return true;
  }
}

export function handleCustomError(err: MonitoringCustomError) {
  err.message = err.message + ': ' + err.description;
  return boomify(err, { statusCode: 503 });
}
