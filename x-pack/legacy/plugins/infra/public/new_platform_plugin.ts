/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart, PluginInitializerContext } from 'kibana/public';

import { compose } from './lib/compose/kibana_compose';
import { startApp } from './apps/start_app';

export class Plugin {
  constructor(context: PluginInitializerContext) {}
  start(core: CoreStart, plugins: any, __LEGACY: any) {
    startApp(compose());
  }
}
