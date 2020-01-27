/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { CanvasStartDeps } from './plugin'; // eslint-disable-line import/order

// @ts-ignore Untyped Kibana Lib
import chrome, { loadingCount } from 'ui/chrome'; // eslint-disable-line import/order
// @ts-ignore Untyped Module
import { uiModules } from 'ui/modules'; // eslint-disable-line import/order
import { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url'; // eslint-disable-line import/order
import { Storage } from '../../../../../src/plugins/kibana_utils/public'; // eslint-disable-line import/order
// @ts-ignore Untyped Kibana Lib
import { formatMsg } from 'ui/notify/lib/format_msg'; // eslint-disable-line import/order
// @ts-ignore Untyped Kibana Lib
import { QueryString } from 'ui/utils/query_string'; // eslint-disable-line import/order

const shimCoreSetup = {
  ...npSetup.core,
};
const shimCoreStart = {
  ...npStart.core,
};
const shimSetupPlugins = {};
const shimStartPlugins: CanvasStartDeps = {
  ...npStart.plugins,
  __LEGACY: {
    // ToDo: Copy directly into canvas
    absoluteToParsedUrl,
    // ToDo: Copy directly into canvas
    formatMsg,
    QueryString,
    // ToDo: Remove in favor of core.application.register
    setRootController: chrome.setRootController,
    storage: Storage,
    // ToDo: Won't be a part of New Platform. Will need to handle internally
    trackSubUrlForApp: chrome.trackSubUrlForApp,
    uiModules,
  },
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
