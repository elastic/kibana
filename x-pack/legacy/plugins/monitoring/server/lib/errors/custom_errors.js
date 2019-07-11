/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export class MonitoringLicenseError extends Error {
  constructor(clusterUuid) {
    super();
    this.message = i18n.translate('xpack.monitoring.errors.monitoringLicenseErrorTitle', {
      defaultMessage: 'Monitoring Licensing Error',
    });
    this.description = i18n.translate('xpack.monitoring.errors.monitoringLicenseErrorTitle', {
      defaultMessage: `Could not find licensing information for cluster ID = ${clusterUuid}.
      Check master node server logs for errors or warnings.`
    });
  }
}
