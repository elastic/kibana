/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function checkLicense(xpackLicenseInfo) {
  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable the Watcher UI
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      enableLink: false,
      enableAPIRoute: false,
      message: i18n.translate('xpack.grokDebugger.unavailableLicenseInformationMessage', {
        defaultMessage:
          'You cannot use the {grokLogParsingTool} Debugger because license information is not available at this time.',
        values: {
          grokLogParsingTool: 'Grok',
        },
      }),
    };
  }

  const isLicenseActive = xpackLicenseInfo.license.isActive();
  const licenseType = xpackLicenseInfo.license.getType();

  // License is not valid
  if (!isLicenseActive) {
    return {
      enableLink: false,
      enableAPIRoute: false,
      message: i18n.translate('xpack.grokDebugger.licenseHasExpiredMessage', {
        defaultMessage:
          'You cannot use the {grokLogParsingTool} Debugger because your {licenseType} license has expired.',
        values: {
          licenseType,
          grokLogParsingTool: 'Grok',
        },
      }),
    };
  }

  // License is valid and active
  return {
    enableLink: true,
    enableAPIRoute: true,
  };
}
