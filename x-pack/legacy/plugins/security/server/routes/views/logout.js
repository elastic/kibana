/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function initLogoutView(server) {
  const logout = server.getHiddenUiAppById('logout');

  server.route({
    method: 'GET',
    path: '/logout',
    handler(request, h) {
      return h.renderAppWithDefaultConfig(logout);
    },
    config: {
      auth: false,
    },
  });
}
