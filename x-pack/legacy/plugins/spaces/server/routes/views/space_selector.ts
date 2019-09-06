/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export function initSpaceSelectorView(server: Legacy.Server) {
  const spaceSelector = server.getHiddenUiAppById('space_selector');

  server.route({
    method: 'GET',
    path: '/spaces/space_selector',
    async handler(request, h) {
      return (await h.renderAppWithDefaultConfig(spaceSelector)).takeover();
    },
  });
}
