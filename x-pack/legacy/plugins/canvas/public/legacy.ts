/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { CanvasStartDeps, CanvasSetupDeps } from './plugin'; // eslint-disable-line import/order

// @ts-ignore Untyped Kibana Lib
import chrome, { loadingCount } from 'ui/chrome'; // eslint-disable-line import/order

const shimCoreSetup = {
  ...npSetup.core,
};
const shimCoreStart = {
  ...npStart.core,
};

const shimSetupPlugins: CanvasSetupDeps = {
  expressions: npSetup.plugins.expressions,
  home: npSetup.plugins.home,
};
const shimStartPlugins: CanvasStartDeps = {
  ...npStart.plugins,
  expressions: npStart.plugins.expressions,
};

// These methods are intended to be a replacement for import from 'ui/whatever'
// These will go away once all of this one plugin start/setup properly
// injects wherever these need to go.
export function getCoreSetup() {
  return shimCoreSetup;
}

export function getCoreStart() {
  return shimCoreStart;
}

export function getSetupPlugins() {
  return shimSetupPlugins;
}

export function getStartPlugins() {
  return shimStartPlugins;
}
