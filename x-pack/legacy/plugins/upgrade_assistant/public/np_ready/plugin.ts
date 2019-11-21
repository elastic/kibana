/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/public';
import { RootComponent } from './application/app';
import { LegacyPlugins } from '../legacy';

export class UpgradeAssistantUIPlugin implements Plugin {
  async setup(
    { http }: CoreSetup,
    { management, __LEGACY: { XSRF, isCloudEnabled } }: LegacyPlugins
  ) {
    const appRegistrar = management.sections.get('kibana');
    return appRegistrar.registerApp({
      mount(__, { __LEGACY: { renderToElement } }) {
        return renderToElement(() => RootComponent({ http, XSRF, isCloudEnabled }));
      },
    });
  }
  async start() {}
  async stop() {}
}
