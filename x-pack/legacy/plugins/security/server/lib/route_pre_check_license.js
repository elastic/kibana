/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const Boom = require('boom');

export function routePreCheckLicense(server) {
  return function forbidApiAccess() {
    const licenseCheckResults = server.newPlatform.setup.plugins.security.__legacyCompat.license.getFeatures();
    if (!licenseCheckResults.showLinks) {
      throw Boom.forbidden(licenseCheckResults.linksMessage);
    } else {
      return null;
    }
  };
}
