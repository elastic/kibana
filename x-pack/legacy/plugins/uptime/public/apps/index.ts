/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { npStart } from 'ui/new_platform';
import { Plugin } from './plugin';
import 'uiExports/embeddableFactories';
new Plugin(
  { opaqueId: Symbol('uptime'), env: {} as any, config: { get: () => ({} as any) } },
  chrome
).start(npStart);
