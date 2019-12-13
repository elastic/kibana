/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackInfo } from '../../../../xpack_main/public/services/xpack_info';
import { uiModules } from 'ui/modules';
import { npStart } from 'ui/new_platform';

uiModules.get('xpack/ml').run(() => {
  const showAppLink = xpackInfo.get('features.ml.showLinks', false);

  const navLinkUpdates = {
    // hide by default, only show once the xpackInfo is initialized
    hidden: !showAppLink,
    disabled: !showAppLink || (showAppLink && !xpackInfo.get('features.ml.isAvailable', false))
  };

  npStart.core.chrome.navLinks.update('ml', navLinkUpdates);
});
