/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { LicensingPluginSetup } from '../../../../plugins/licensing/public';
import { GraphPlugin } from './plugin';

type XpackNpSetupDeps = typeof npSetup.plugins & {
  licensing: LicensingPluginSetup;
};

(async () => {
  const instance = new GraphPlugin();
  instance.setup(npSetup.core, {
    ...(npSetup.plugins as XpackNpSetupDeps),
  });
  instance.start(npStart.core, {
    npData: npStart.plugins.data,
    navigation: npStart.plugins.navigation,
  });
})();
