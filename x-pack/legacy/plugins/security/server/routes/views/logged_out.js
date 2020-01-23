/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function initLoggedOutView(
  {
    __legacyCompat: {
      config: { cookieName },
    },
  },
  server
) {
  const config = server.config();
  const loggedOut = server.getHiddenUiAppById('logged_out');

  server.route({
    method: 'GET',
    path: '/logged_out',
    handler(request, h) {
      const isUserAlreadyLoggedIn = !!request.state[cookieName];
      if (isUserAlreadyLoggedIn) {
        const basePath = config.get('server.basePath');
        return h.redirect(`${basePath}/`);
      }
      return h.renderAppWithDefaultConfig(loggedOut);
    },
    config: {
      auth: false,
    },
  });
}
