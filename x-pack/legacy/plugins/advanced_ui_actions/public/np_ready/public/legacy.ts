/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup, npStart } from 'ui/new_platform';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import { plugin } from '.';

const pluginInstance = plugin({} as any);
export const setup = pluginInstance.setup(npSetup.core, {
  embeddable: npSetup.plugins.embeddable,
  uiActions: npSetup.plugins.uiActions,
});
export const start = pluginInstance.start(npStart.core, {
  embeddable: npStart.plugins.embeddable,
  uiActions: npStart.plugins.uiActions,
});
