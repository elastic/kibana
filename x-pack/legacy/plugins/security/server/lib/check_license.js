/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * @typedef {Object} LicenseCheckResult Result of the license check.
 * @property {boolean} showLogin Indicates whether we show login page or skip it.
 * @property {boolean} allowLogin Indicates whether we allow login or disable it on the login page.
 * @property {boolean} showLinks Indicates whether we show security links throughout the kibana app.
 * @property {boolean} allowRoleDocumentLevelSecurity Indicates whether we allow users to define document level
 * security in roles.
 * @property {boolean} allowRoleFieldLevelSecurity Indicates whether we allow users to define field level security
 * in roles
 * @property {string} [linksMessage] Message to show when security links are clicked throughout the kibana app.
 */

/**
 * Returns object that defines behavior of the security related areas (login page, user management etc.) based
 * on the license information extracted from the xPackInfo.
 * @param {XPackInfo} xPackInfo XPackInfo instance to extract license information from.
 * @returns {LicenseCheckResult}
 */
export function checkLicense(xPackInfo) {
  // If, for some reason, we cannot get license information from Elasticsearch,
  // assume worst-case and lock user at login screen.
  if (!xPackInfo.isAvailable()) {
    return {
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: false,
      layout: xPackInfo.isXpackUnavailable() ? 'error-xpack-unavailable' : 'error-es-unavailable',
    };
  }

  const isEnabledInES = xPackInfo.feature('security').isEnabled();
  if (!isEnabledInES) {
    return {
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: false,
      linksMessage: 'Access is denied because Security is disabled in Elasticsearch.',
    };
  }

  const isLicensePlatinumOrTrial = xPackInfo.license.isOneOf(['platinum', 'trial']);
  return {
    showLogin: true,
    allowLogin: true,
    showLinks: true,
    // Only platinum and trial licenses are compliant with field- and document-level security.
    allowRoleDocumentLevelSecurity: isLicensePlatinumOrTrial,
    allowRoleFieldLevelSecurity: isLicensePlatinumOrTrial,
    allowRbac: true,
  };
}
