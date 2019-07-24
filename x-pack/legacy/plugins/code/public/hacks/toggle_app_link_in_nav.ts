/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

const codeUiEnabled = npStart.core.injectedMetadata.getInjectedVar('codeUiEnabled');
if (codeUiEnabled === false) {
  npStart.core.chrome.navLinks.update('code', { hidden: true });
}
