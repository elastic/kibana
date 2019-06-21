/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { npStart } from 'ui/new_platform';

uiModules.get('monitoring/hacks').run((monitoringUiEnabled) => {
  if (monitoringUiEnabled) {
    return;
  }

  npStart.core.chrome.navLinks.update('monitoring', { hidden: true });
});
