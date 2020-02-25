/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

export const Path = {
  isUnauthenticated() {
    const path = chrome.removeBasePath(window.location.pathname);
    return path === '/login' || path === '/logout' || path === '/logged_out' || path === '/status';
  },
};
