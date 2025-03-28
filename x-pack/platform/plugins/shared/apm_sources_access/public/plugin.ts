/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { Plugin } from '@kbn/core/public';
import { registerServices } from './register_services';

/**
 * APM Source setup services
 */
export type ApmSourceAccessPluginSetup = ReturnType<ApmSourceAccessPlugin['setup']>;
/**
 * APM Source start services
 */
export type ApmSourceAccessPluginStart = ReturnType<ApmSourceAccessPlugin['start']>;

export class ApmSourceAccessPlugin
  implements Plugin<ApmSourceAccessPluginSetup, ApmSourceAccessPluginStart, {}>
{
  public setup() {}

  public start(core: CoreStart) {
    return registerServices(core);
  }

  public stop() {}
}
