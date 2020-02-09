/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

const module = uiModules.get('security');
module.service('autoLogout', ($window, Promise) => {
  return () => {
    const next = chrome.removeBasePath(`${window.location.pathname}${window.location.hash}`);
    $window.location.href = chrome.addBasePath(
      `/logout?next=${encodeURIComponent(next)}&msg=SESSION_EXPIRED`
    );
    return Promise.halt();
  };
});
