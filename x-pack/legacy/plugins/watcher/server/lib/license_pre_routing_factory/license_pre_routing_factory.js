/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { wrapCustomError } from '../error_wrappers';
import { PLUGIN } from '../../../common/constants';
import { LICENSE_STATUS_VALID } from '../../../../../common/constants/license_status';

export const licensePreRoutingFactory = once(server => {
  const xpackMainPlugin = server.plugins.xpack_main;

  // License checking and enable/disable logic
  function licensePreRouting() {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN.ID).getLicenseCheckResults();
    const { status } = licenseCheckResults;

    if (status !== LICENSE_STATUS_VALID) {
      const error = new Error(licenseCheckResults.message);
      const statusCode = 403;
      throw wrapCustomError(error, statusCode);
    }

    return null;
  }

  return licensePreRouting;
});
