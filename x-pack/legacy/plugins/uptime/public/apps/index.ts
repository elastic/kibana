/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import chrome from 'ui/chrome';
import { npStart } from 'ui/new_platform';
import { Plugin } from './plugin';

new Plugin(
  { opaqueId: Symbol('uptime'), env: {} as any, config: { create: () => of({} as any) } },
  chrome
).start(npStart);
