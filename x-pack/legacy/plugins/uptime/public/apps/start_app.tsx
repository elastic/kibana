/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'react-vis/dist/style.css';
import chrome from 'ui/chrome';
import { createApolloClient } from '../lib/adapters/framework/apollo_client_adapter';
import { UMFrontendLibs } from '../lib/lib';
import { UptimeApp } from '../uptime_app';
import template from './template.html';
import { PLUGIN } from '../../common/constants';

export async function startApp(libs: UMFrontendLibs) {
  // @ts-ignore
  chrome.setRootTemplate(template);
  const checkForRoot = () => {
    return new Promise(resolve => {
      const ready = !!document.getElementById(PLUGIN.APP_ROOT_ID);
      if (ready) {
        resolve();
      } else {
        setTimeout(() => resolve(checkForRoot()), 10);
      }
    });
  };
  checkForRoot().then(() => {
    libs.framework.render(UptimeApp, createApolloClient);
  });
}
