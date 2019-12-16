/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { PluginInitializerContext } from 'kibana/public';
import chrome from 'ui/chrome';
// @ts-ignore
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
// @ts-ignore
import { timezoneProvider } from 'ui/vis/lib/timezone';
import { plugin } from './new_platform_index';

const ROOT_ELEMENT_ID = 'react-infra-root';
export { useTrackPageview } from './hooks/use_track_metric';
export { ROOT_ELEMENT_ID };

const { core, plugins } = npStart;
const __LEGACY = {
  uiModules,
  uiRoutes,
  timezoneProvider,
};
// This will be moved to core.application.register when the new platform
// migration is complete.
// @ts-ignore
chrome.setRootTemplate(`
  <main
    id="${ROOT_ELEMENT_ID}"
    class="infReactRoot"
  ></main>
`);

const checkForRoot = () => {
  return new Promise(resolve => {
    const ready = !!document.getElementById(ROOT_ELEMENT_ID);
    if (ready) {
      resolve();
    } else {
      setTimeout(() => resolve(checkForRoot()), 10);
    }
  });
};

checkForRoot().then(() => {
  plugin({} as PluginInitializerContext).start(core, plugins, __LEGACY);
});
