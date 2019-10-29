/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { Server } from 'hapi';
import { InfraConfig } from './new_platform_config.schema';
import { Legacy } from '../../../../../kibana';
import { initInfraServer } from './infra_server';
import { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { InfraKibanaBackendFrameworkAdapter } from './lib/adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { InfraLogEntriesDomain } from './lib/domains/log_entries_domain';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import { InfraLogAnalysis } from './lib/log_analysis';
import { InfraSnapshot } from './lib/snapshot';
import { InfraSourceStatus } from './lib/source_status';
import { InfraSources } from './lib/sources';
import { InfraServerPluginDeps } from './lib/adapters/framework';

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
  public config: InfraConfig = DEFAULT_CONFIG;
  private legacyServer: Legacy.Server;
  public libs: InfraBackendLibs | undefined;

  constructor(context: PluginInitializerContext, legacyServer: Legacy.Server) {
    this.legacyServer = legacyServer;
    const config$ = context.config.create<InfraConfig>();
    config$.subscribe(configValue => {
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

  setup(core: CoreSetup, plugins: InfraServerPluginDeps) {
    const framework = new InfraKibanaBackendFrameworkAdapter(core, this.config, plugins);
    const sources = new InfraSources({
      config: this.config,
      savedObjects: this.legacyServer.savedObjects,
    });
    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      {
        sources,
      }
    );
    const snapshot = new InfraSnapshot({ sources, framework });
    const logAnalysis = new InfraLogAnalysis({ framework });

    // TODO: separate these out individually and do away with "domains" as a temporary group
    const domainLibs: InfraDomainLibs = {
      fields: new InfraFieldsDomain(new FrameworkFieldsAdapter(framework), {
        sources,
      }),
      logEntries: new InfraLogEntriesDomain(new InfraKibanaLogEntriesAdapter(framework), {
        sources,
      }),
      metrics: new InfraMetricsDomain(new KibanaMetricsAdapter(framework)),
    };

    this.libs = {
      configuration: this.config, // NP_TODO: Do we ever use this anywhere else in the app?
      framework,
      logAnalysis,
      snapshot,
      sources,
      sourceStatus,
      ...domainLibs,
    };

    initInfraServer(this.libs);
  }
}
