/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { PLUGIN } from '../constants/plugin';
import { LICENSE_STATUS_VALID } from '../../../../common/constants';
import { ActionsPluginsSetup } from '../shim';

export const licensePreRoutingFactory = (plugins: ActionsPluginsSetup) => {
  // License checking and enable/disable logic
  function licensePreRouting() {
    const licenseCheckResults = plugins.xpack_main.info.feature(PLUGIN.ID).getLicenseCheckResults();
    const { status } = licenseCheckResults;

    if (status !== LICENSE_STATUS_VALID) {
      throw Boom.forbidden(licenseCheckResults.message);
    }

    return null;
  }

  return licensePreRouting;
};
