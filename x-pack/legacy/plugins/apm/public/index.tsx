/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import 'react-vis/dist/style.css';
import { PluginInitializerContext } from 'kibana/public';
import 'ui/autoload/all';
import chrome from 'ui/chrome';
import { plugin } from '../../../../plugins/apm/public';
import { REACT_APP_ROOT_ID } from '../../../../plugins/apm/public/plugin';
import './style/global_overrides.css';
import template from './templates/index.html';

const { core, plugins } = npStart;

// This will be moved to core.application.register when the new platform
// migration is complete.
// @ts-ignore
chrome.setRootTemplate(template);

const checkForRoot = () => {
  return new Promise(resolve => {
    const ready = !!document.getElementById(REACT_APP_ROOT_ID);
    if (ready) {
      resolve();
    } else {
      setTimeout(() => resolve(checkForRoot()), 10);
    }
  });
};
checkForRoot().then(() => {
  plugin({} as PluginInitializerContext).start(core, plugins);
});
