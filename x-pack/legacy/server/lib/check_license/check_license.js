/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  LICENSE_STATUS_UNAVAILABLE,
  LICENSE_STATUS_INVALID,
  LICENSE_STATUS_EXPIRED,
  LICENSE_STATUS_VALID,
  RANKED_LICENSE_TYPES,
} from '../../../common/constants';

export function checkLicense(pluginName, minimumLicenseRequired, xpackLicenseInfo) {
  if (!RANKED_LICENSE_TYPES.includes(minimumLicenseRequired)) {
    throw new Error(`Invalid license type supplied to checkLicense: ${minimumLicenseRequired}`);
  }

  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      status: LICENSE_STATUS_UNAVAILABLE,
      message: i18n.translate('xpack.server.checkLicense.errorUnavailableMessage', {
        defaultMessage:
          'You cannot use {pluginName} because license information is not available at this time.',
        values: { pluginName },
      }),
    };
  }

  const { license } = xpackLicenseInfo;
  const isLicenseModeValid = license.isOneOf(
    [...RANKED_LICENSE_TYPES].splice(RANKED_LICENSE_TYPES.indexOf(minimumLicenseRequired))
  );
  const isLicenseActive = license.isActive();
  const licenseType = license.getType();

  // License is not valid
  if (!isLicenseModeValid) {
    return {
      status: LICENSE_STATUS_INVALID,
      message: i18n.translate('xpack.server.checkLicense.errorUnsupportedMessage', {
        defaultMessage:
          'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
        values: { licenseType, pluginName },
      }),
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      status: LICENSE_STATUS_EXPIRED,
      message: i18n.translate('xpack.server.checkLicense.errorExpiredMessage', {
        defaultMessage:
          'You cannot use {pluginName} because your {licenseType} license has expired.',
        values: { licenseType, pluginName },
      }),
    };
  }

  // License is valid and active
  return {
    status: LICENSE_STATUS_VALID,
  };
}
