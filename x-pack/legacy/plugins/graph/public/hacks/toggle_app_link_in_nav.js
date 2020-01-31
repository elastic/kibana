/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { npStart } from 'ui/new_platform';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

uiModules.get('xpack/graph').run(() => {
  const navLinkUpdates = {};
  navLinkUpdates.hidden = true;
  const showAppLink = xpackInfo.get('features.graph.showAppLink', false);
  navLinkUpdates.hidden = !showAppLink;
  if (showAppLink) {
    navLinkUpdates.disabled = !xpackInfo.get('features.graph.enableAppLink', false);
    navLinkUpdates.tooltip = xpackInfo.get('features.graph.message');
  }

  npStart.core.chrome.navLinks.update('graph', navLinkUpdates);
});
