/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

const apmUiEnabled = chrome.getInjected('apmUiEnabled');
if (apmUiEnabled === false && chrome.navLinkExists('apm')) {
  chrome.getNavLinkById('apm').hidden = true;
}
