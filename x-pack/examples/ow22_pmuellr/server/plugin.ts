/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, Logger, CoreSetup, PluginInitializerContext } from 'kibana/server';

import { PluginSetupContract as AlertingSetup } from '../../../plugins/alerting/server';
import { registerRuleTypes } from './rule_types';
import { registerRoutes } from './routes';

// this plugin's dependencies
export interface Ow22pmuellrDeps {
  alerting: AlertingSetup;
}

export class Ow22pmuellrPlugin implements Plugin<void, void, Ow22pmuellrDeps> {
  readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { alerting }: Ow22pmuellrDeps) {
    registerRuleTypes(this.logger, alerting);

    const router = core.http.createRouter();
    registerRoutes(this.logger, router);
  }

  public start() {}

  public stop() {}
}
