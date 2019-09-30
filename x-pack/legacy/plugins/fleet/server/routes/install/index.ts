/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import {
  FrameworkRequest,
  FrameworkResponseToolkit,
  FrameworkResponseObject,
} from '../../adapters/framework/adapter_types';
import { FleetServerLib } from '../../libs/types';

export const createGETInstallScript = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/install/{osType}',
  config: {
    auth: false,
    validate: {
      params: Joi.object({
        osType: Joi.string().valid(['macos']),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{
      params: {
        osType: 'macos';
      };
    }>,
    h: FrameworkResponseToolkit
  ): Promise<FrameworkResponseObject> => {
    const script = libs.install.getScript(request.params.osType);
    const response = h.response(script);

    return response;
  },
});
