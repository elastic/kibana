/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { wrapCustomError } from '../error_wrappers';
import { PLUGIN_ID } from '../../../common/constants';

export const licensePreRoutingFactory = once(server => {
  const xpackMainPlugin = server.plugins.xpack_main;

  // License checking and enable/disable logic
  function licensePreRouting() {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN_ID).getLicenseCheckResults();
    if (!licenseCheckResults.isAvailable) {
      const error = new Error(licenseCheckResults.message);
      const statusCode = 403;
      throw wrapCustomError(error, statusCode);
    }

    return null;
  }

  return licensePreRouting;
});
