/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function checkLicense(xpackLicenseInfo) {
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      showAppLink: true,
      enableAppLink: false,
      message: i18n.translate(
        'xpack.graph.serverSideErrors.unavailableLicenseInformationErrorMessage',
        {
          defaultMessage:
            'Graph is unavailable - license information is not available at this time.',
        }
      ),
    };
  }

  const graphFeature = xpackLicenseInfo.feature('graph');
  if (!graphFeature.isEnabled()) {
    return {
      showAppLink: false,
      enableAppLink: false,
      message: i18n.translate('xpack.graph.serverSideErrors.unavailableGraphErrorMessage', {
        defaultMessage: 'Graph is unavailable',
      }),
    };
  }

  const isLicenseActive = xpackLicenseInfo.license.isActive();
  let message;
  if (!isLicenseActive) {
    message = i18n.translate('xpack.graph.serverSideErrors.expiredLicenseErrorMessage', {
      defaultMessage: 'Graph is unavailable - license has expired.',
    });
  }

  if (xpackLicenseInfo.license.isOneOf(['trial', 'platinum'])) {
    return {
      showAppLink: true,
      enableAppLink: isLicenseActive,
      message,
    };
  }

  message = i18n.translate('xpack.graph.serverSideErrors.wrongLicenseTypeErrorMessage', {
    defaultMessage:
      'Graph is unavailable for the current {licenseType} license. Please upgrade your license.',
    values: {
      licenseType: xpackLicenseInfo.license.getType(),
    },
  });

  return {
    showAppLink: false,
    enableAppLink: false,
    message,
  };
}
