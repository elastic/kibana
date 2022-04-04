/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from 'kibana/server';

import { PluginSetupContract as AlertingSetup } from '../../../plugins/alerting/server';

// this plugin's dependencies
export interface Ow22pmuellrDeps {
  alerting: AlertingSetup;
}

export class Ow22pmuellrPlugin implements Plugin<void, void, Ow22pmuellrDeps> {
  public setup(core: CoreSetup, { alerting }: Ow22pmuellrDeps) {}

  public start() {}

  public stop() {}
}
