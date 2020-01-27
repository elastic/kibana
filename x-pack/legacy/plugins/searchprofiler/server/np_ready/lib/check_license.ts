/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { XPackInfo } from '../../../../xpack_main/server/lib/xpack_info';

export function checkLicense(
  xpackLicenseInfo: XPackInfo
): { showAppLink: boolean; enableAppLink: boolean; message: string | undefined } {
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      showAppLink: true,
      enableAppLink: false,
      message: i18n.translate('xpack.searchProfiler.unavailableLicenseInformationMessage', {
        defaultMessage:
          'Search Profiler is unavailable - license information is not available at this time.',
      }),
    };
  }

  const isLicenseActive = xpackLicenseInfo.license.isActive();
  let message: string | undefined;
  if (!isLicenseActive) {
    message = i18n.translate('xpack.searchProfiler.licenseHasExpiredMessage', {
      defaultMessage: 'Search Profiler is unavailable - license has expired.',
    });
  }

  if (
    xpackLicenseInfo.license.isOneOf([
      'trial',
      'basic',
      'standard',
      'gold',
      'platinum',
      'enterprise',
    ])
  ) {
    return {
      showAppLink: true,
      enableAppLink: isLicenseActive,
      message,
    };
  }

  message = i18n.translate('xpack.searchProfiler.upgradeLicenseMessage', {
    defaultMessage:
      'Search Profiler is unavailable for the current {licenseInfo} license. Please upgrade your license.',
    values: { licenseInfo: xpackLicenseInfo.license.getType() },
  });
  return {
    showAppLink: false,
    enableAppLink: false,
    message,
  };
}
