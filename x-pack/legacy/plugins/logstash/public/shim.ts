/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { LogstashPlugin } from './plugin';

(async () => {
  const plugin = new LogstashPlugin();
  await plugin.setup(npSetup.core, npSetup.plugins as any);
  await plugin.start(npStart.core);
})();
