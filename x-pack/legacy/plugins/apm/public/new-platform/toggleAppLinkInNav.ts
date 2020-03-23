/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { ConfigSchema } from './plugin';

export function toggleAppLinkInNav(core: CoreStart, { ui }: ConfigSchema) {
  if (ui.enabled === false) {
    core.chrome.navLinks.update('apm', { hidden: true });
  }
}
