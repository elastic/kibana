/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { initServerWithKibana } from './kibana.index';
import { UptimeCoreSetup, UptimeCorePlugins } from './lib/adapters/framework';
import {UptimeConfig} from "./new_platform_config.schema";
import {Legacy} from "../../../../../kibana";


const DEFAULT_CONFIG: InfraConfig = {
  enabled: true,
  indexPattern: "heartbeat-8.*"
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}

export class Plugin {
  public config: UptimeConfig = DEFAULT_CONFIG;

  constructor(context: PluginInitializerContext) {
    console.log("CTX", context);
    const config$ = context.config.create<UptimeConfig>();
    config$.subscribe(configValue => {
      console.log("SUBSCRIBE", configValue)
      this.config = {
        ...DEFAULT_CONFIG,
        enabled: configValue.enabled,
        indexPattern: configValue.indexPattern
      }
    });
  }

  public setup(core: UptimeCoreSetup, config: UptimeConfig, plugins: UptimeCorePlugins) {
    initServerWithKibana(core, config, plugins);
  }
}
