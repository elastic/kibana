/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyCoreStart, PluginInitializerContext } from 'src/core/public';
import { PluginsStart } from 'ui/new_platform/new_platform';
import { Chrome } from 'ui/chrome';
import { UMFrontendLibs } from '../lib/lib';
import { PLUGIN } from '../../common/constants';
import { getKibanaFrameworkAdapter } from '../lib/adapters/framework/new_platform_adapter';
import template from './template.html';
import { UptimeApp } from '../uptime_app';
import { createApolloClient } from '../lib/adapters/framework/apollo_client_adapter';

export interface StartObject {
  core: LegacyCoreStart;
  plugins: PluginsStart;
}

export class Plugin {
  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext,
    private readonly chrome: Chrome
  ) {
    this.chrome = chrome;
  }

  public start(start: StartObject): void {
    const libs: UMFrontendLibs = {
      framework: getKibanaFrameworkAdapter(start.core, start.plugins),
    };
    // @ts-ignore improper type description
    this.chrome.setRootTemplate(template);
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
}
