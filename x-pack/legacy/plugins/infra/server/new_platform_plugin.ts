/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { InfraConfig } from '../../../../plugins/infra/server';
import { initInfraServer } from './infra_server';
import { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { InfraLogEntriesDomain } from './lib/domains/log_entries_domain';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import { LogEntryCategoriesAnalysis, LogEntryRateAnalysis } from './lib/log_analysis';
import { InfraSnapshot } from './lib/snapshot';
import { InfraSourceStatus } from './lib/source_status';
import { InfraSources } from './lib/sources';
import { InfraServerPluginDeps } from './lib/adapters/framework';
import { METRICS_FEATURE, LOGS_FEATURE } from './features';
import { UsageCollector } from './usage/usage_collector';
import { APP_ID } from '../index';
import { InfraStaticSourceConfiguration } from './lib/sources/types';

export interface KbnServer extends Server {
  usage: any;
}

const logsSampleDataLinkLabel = i18n.translate('xpack.infra.sampleDataLinkLabel', {
  defaultMessage: 'Logs',
});

export interface InfraPluginSetup {
  defineInternalSourceConfiguration: (
    sourceId: string,
    sourceProperties: InfraStaticSourceConfiguration
  ) => void;
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
  public libs: InfraBackendLibs | undefined;

  constructor(context: PluginInitializerContext) {
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
    const framework = new KibanaFramework(core, this.config, plugins);
    const sources = new InfraSources({
      config: this.config,
    });
    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      {
        sources,
      }
    );
    const snapshot = new InfraSnapshot({ sources, framework });
    const logEntryCategoriesAnalysis = new LogEntryCategoriesAnalysis({ framework });
    const logEntryRateAnalysis = new LogEntryRateAnalysis({ framework });

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
      configuration: this.config,
      framework,
      logEntryCategoriesAnalysis,
      logEntryRateAnalysis,
      snapshot,
      sources,
      sourceStatus,
      ...domainLibs,
    };

    plugins.features.registerFeature(METRICS_FEATURE);
    plugins.features.registerFeature(LOGS_FEATURE);

    plugins.home.sampleData.addAppLinksToSampleDataset('logs', [
      {
        path: `/app/${APP_ID}#/logs`,
        label: logsSampleDataLinkLabel,
        icon: 'logsApp',
      },
    ]);

    initInfraServer(this.libs);

    // Telemetry
    UsageCollector.registerUsageCollector(plugins.usageCollection);

    return {
      defineInternalSourceConfiguration(sourceId, sourceProperties) {
        sources.defineInternalSourceConfiguration(sourceId, sourceProperties);
      },
    } as InfraPluginSetup;
  }
}
