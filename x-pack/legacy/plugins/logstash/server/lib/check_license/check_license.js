/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function checkLicense(xpackLicenseInfo) {
  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable the Logstash pipeline UI
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      isAvailable: false,
      enableLinks: false,
      isReadOnly: false,
      message: i18n.translate(
        'xpack.logstash.managementSection.notPossibleToManagePipelinesMessage',
        {
          defaultMessage:
            'You cannot manage Logstash pipelines because license information is not available at this time.',
        }
      ),
    };
  }

  const VALID_LICENSE_MODES = ['trial', 'standard', 'gold', 'platinum'];

  const isLicenseModeValid = xpackLicenseInfo.license.isOneOf(VALID_LICENSE_MODES);
  const isLicenseActive = xpackLicenseInfo.license.isActive();
  const licenseType = xpackLicenseInfo.license.getType();
  const isSecurityEnabled = xpackLicenseInfo.feature('security').isEnabled();

  // Security is not enabled in ES
  if (!isSecurityEnabled) {
    const message = i18n.translate('xpack.logstash.managementSection.enableSecurityDescription', {
      defaultMessage:
        'Security must be enabled in order to use Logstash pipeline management features.' +
        ' Please set xpack.security.enabled: true in your elasticsearch.yml.',
    });
    return {
      isAvailable: false,
      enableLinks: false,
      isReadOnly: false,
      message,
    };
  }

  // License is not valid
  if (!isLicenseModeValid) {
    return {
      isAvailable: false,
      enableLinks: false,
      isReadOnly: false,
      message: i18n.translate('xpack.logstash.managementSection.licenseDoesNotSupportDescription', {
        defaultMessage:
          'Your {licenseType} license does not support Logstash pipeline management features. Please upgrade your license.',
        values: { licenseType },
      }),
    };
  }

  // License is valid but not active, we go into a read-only mode.
  if (!isLicenseActive) {
    return {
      isAvailable: true,
      enableLinks: true,
      isReadOnly: true,
      message: i18n.translate(
        'xpack.logstash.managementSection.pipelineCrudOperationsNotAllowedDescription',
        {
          defaultMessage:
            'You cannot edit, create, or delete your Logstash pipelines because your {licenseType} license has expired.',
          values: { licenseType },
        }
      ),
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    enableLinks: true,
    isReadOnly: false,
  };
}
