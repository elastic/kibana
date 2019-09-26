/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup, npStart } from 'ui/new_platform';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import { plugin } from '.';

import {
  setup as embeddableSetup,
  start as embeddableStart,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';

const pluginInstance = plugin({} as any);
export const setup = pluginInstance.setup(npSetup.core, {
  embeddable: embeddableSetup,
});
export const start = pluginInstance.start(npStart.core, {
  embeddable: embeddableStart,
  uiActions: npStart.plugins.uiActions,
});
