/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @kbn/eslint/no-restricted-paths */
import 'ui/autoload/all';

import 'uiExports/interpreter';
import 'uiExports/embeddableFactories';
import 'uiExports/embeddableActions';

import { npSetup, npStart } from 'ui/new_platform';
import uiRoutes from 'ui/routes';
// @ts-ignore
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import template from './index.html';
/* eslint-enable @kbn/eslint/no-restricted-paths */
import { AdvancedEmbeddablePlugin, REACT_ROOT_ID } from './plugin';

// This will be moved to core.application.register when the new platform
// migration is complete.
// @ts-ignore
chrome.setRootTemplate(template);

const checkForRoot = () => {
  return new Promise(resolve => {
    const ready = !!document.getElementById(REACT_ROOT_ID);
    if (ready) {
      resolve();
    } else {
      setTimeout(() => resolve(checkForRoot()), 10);
    }
  });
};

checkForRoot().then(() => {
  const instance = new AdvancedEmbeddablePlugin({});
  instance.setup(npSetup.core, {
    ...npSetup.plugins,
  });
  instance.start(npStart.core, {
    ...npStart.plugins,
  });
});
