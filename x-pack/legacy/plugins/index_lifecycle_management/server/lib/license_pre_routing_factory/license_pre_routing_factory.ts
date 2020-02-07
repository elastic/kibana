/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { Legacy } from 'kibana';

import { PLUGIN } from '../../../common/constants';
import { wrapCustomError } from '../error_wrappers';

export const licensePreRoutingFactory = once((server: Legacy.Server) => {
  const xpackMainPlugin = server.plugins.xpack_main;

  // License checking and enable/disable logic
  function licensePreRouting() {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
    if (!licenseCheckResults.isAvailable) {
      const error = new Error(licenseCheckResults.message);
      const statusCode = 403;
      throw wrapCustomError(error, statusCode);
    }

    return null;
  }

  return licensePreRouting;
});
