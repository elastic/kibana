/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { PLUGIN_ID } from '../../common/constants';
import { ServerFacade } from '../../../index_management';

export const licensePreRoutingFactory = (server: ServerFacade) => {
  const xpackMainPlugin = server.plugins.xpack_main;

  // License checking and enable/disable logic
  function licensePreRouting() {
    const licenseCheckResults = xpackMainPlugin.info.feature(PLUGIN_ID).getLicenseCheckResults();
    if (!licenseCheckResults.enableAPIRoute) {
      throw Boom.forbidden(licenseCheckResults.message);
    }

    return null;
  }

  return licensePreRouting;
};
