/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Moment } from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { AlertInstance } from '../../../../../../plugins/alerting/server';
import { AlertLicense } from '../../alerts/types';

const RESOLVED_SUBJECT = i18n.translate(
  'xpack.monitoring.alerts.licenseExpiration.resolvedSubject',
  {
    defaultMessage: 'RESOLVED X-Pack Monitoring: License Expiration',
  }
);

const NEW_SUBJECT = i18n.translate('xpack.monitoring.alerts.licenseExpiration.newSubject', {
  defaultMessage: 'NEW X-Pack Monitoring: License Expiration',
});

export function executeActions(
  instance: AlertInstance,
  license: AlertLicense,
  $expiry: Moment,
  dateFormat: string,
  emailAddress: string,
  resolved: boolean = false
) {
  if (resolved) {
    instance.scheduleActions('default', {
      subject: RESOLVED_SUBJECT,
      message: `This cluster alert has been resolved: Cluster '${
        license.clusterName
      }' license was going to expire on ${$expiry.format(dateFormat)}.`,
      to: emailAddress,
    });
  } else {
    instance.scheduleActions('default', {
      subject: NEW_SUBJECT,
      message: `Cluster '${license.clusterName}' license is going to expire on ${$expiry.format(
        dateFormat
      )}. Please update your license.`,
      to: emailAddress,
    });
  }
}

export function getUiMessage(license: AlertLicense, timezone: string, resolved: boolean = false) {
  if (resolved) {
    return i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.resolvedMessage', {
      defaultMessage: `This cluster's license is active.`,
    });
  }
  return i18n.translate('xpack.monitoring.alerts.licenseExpiration.ui.firingMessage', {
    defaultMessage: `This cluster's license is going to expire in #relative at #absolute.`,
  });
}
