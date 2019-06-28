/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { Legacy } from 'kibana';

export function initOverwrittenSessionView(server: Legacy.Server) {
  server.route({
    method: 'GET',
    path: '/overwritten_session',
    handler(request: Request, h: ResponseToolkit) {
      return h.renderAppWithDefaultConfig(server.getHiddenUiAppById('overwritten_session'));
    },
  });
}
