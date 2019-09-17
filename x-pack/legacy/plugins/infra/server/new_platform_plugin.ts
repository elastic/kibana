/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InternalCoreSetup, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { Server } from 'hapi';
import { InfraConfig } from './new_platform_config.schema';
import { Legacy } from '../../../../../kibana';
import { initInfraServer } from './infra_server';
import { compose } from './lib/compose/kibana';
import { InfraBackendLibs } from './lib/infra_types';

export interface KbnServer extends Server {
  usage: any;
}

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
  private legacyServer: Legacy.Server;
  public libs: InfraBackendLibs | undefined;

  constructor(context: PluginInitializerContext, legacyServer: Legacy.Server) {
    this.legacyServer = legacyServer;
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

  getLibs() {
    if (!this.libs) {
      throw new Error('libs not set up yet');
    }
    return this.libs;
  }

  setup(core: InternalCoreSetup) {
    this.libs = compose(
      core,
      this.config,
      this.legacyServer // NP_TODO: REMOVE ... temporary while shimming only
    );
    initInfraServer(this.libs);
  }
}
