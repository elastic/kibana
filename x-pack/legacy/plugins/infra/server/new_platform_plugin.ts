/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InternalCoreSetup, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { initServerWithKibana } from './kibana.index';
import { InfraConfig } from './new_platform_config.schema';

const DEFAULT_CONFIG: InfraConfig = {
  enabled: true,
  query: {
    partitionSize: 75,
    partitionFactor: 1.2,
  },
};

export class InfraServerPlugin {
  public config$: Observable<InfraConfig>;
  public config: InfraConfig = DEFAULT_CONFIG;

  constructor(context: PluginInitializerContext) {
    this.config$ = context.config.create<InfraConfig>();
    this.config$.subscribe(configValue => {
      this.config = {
        ...DEFAULT_CONFIG,
        enabled: configValue.enabled,
        query: {
          ...DEFAULT_CONFIG.query,
          ...configValue.query,
        },
      };
    });
  }

  setup(core: InternalCoreSetup) {
    initServerWithKibana(core, this.config);
  }
}
