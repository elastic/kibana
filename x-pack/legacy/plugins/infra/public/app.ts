/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NP_TODO: This app.ts layer is needed until we migrate 100% to the NP.
// This is so other plugins can import from our public/index file without trying to
// actually mount and run our application. Once in the NP this won't be an issue
// as the NP will look for an export named "plugin" and run that from the index file.

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
