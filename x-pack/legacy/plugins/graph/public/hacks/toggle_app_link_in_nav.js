/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { npStart } from 'ui/new_platform';

import { xpackInfoService } from 'plugins/xpack_main/services/xpack_info';

uiModules.get('xpack/graph')
  .run(() => {
    const navLinkUpdates = {};
    navLinkUpdates.hidden = true;
    const showAppLink = xpackInfoService.get('features.graph.showAppLink', false);
    navLinkUpdates.hidden = !showAppLink;
    if (showAppLink) {
      navLinkUpdates.disabled = !xpackInfoService.get('features.graph.enableAppLink', false);
      navLinkUpdates.tooltip = xpackInfoService.get('features.graph.message');
    }

    npStart.core.chrome.navLinks.update('graph', navLinkUpdates);
  });
