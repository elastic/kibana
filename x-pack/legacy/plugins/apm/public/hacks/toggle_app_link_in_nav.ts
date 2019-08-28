/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

const { core } = npStart;
const apmUiEnabled = core.injectedMetadata.getInjectedVar('apmUiEnabled');

if (apmUiEnabled === false) {
  core.chrome.navLinks.update('apm', { hidden: true });
}
