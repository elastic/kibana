/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ENTER_SPACE_PATH } from '../../../common/constants';
import { wrapError } from '../../lib/errors';

export function initEnterSpaceView(server: Legacy.Server) {
  server.route({
    method: 'GET',
    path: ENTER_SPACE_PATH,
    async handler(request, h) {
      try {
        return h.redirect(await request.getDefaultRoute());
      } catch (e) {
        server.log(['spaces', 'error'], `Error navigating to space: ${e}`);
        return wrapError(e);
      }
    },
  });
}
