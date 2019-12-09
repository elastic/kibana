/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkFieldsAdapter } from '../adapters/fields/framework_fields_adapter';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from '../adapters/log_entries/kibana_log_entries_adapter';
import { KibanaMetricsAdapter } from '../adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from '../adapters/source_status';
import { InfraFieldsDomain } from '../domains/fields_domain';
import { InfraLogEntriesDomain } from '../domains/log_entries_domain';
import { InfraMetricsDomain } from '../domains/metrics_domain';
import { InfraBackendLibs, InfraDomainLibs } from '../infra_types';
import { InfraLogAnalysis } from '../log_analysis';
import { InfraSnapshot } from '../snapshot';
import { InfraSourceStatus } from '../source_status';
import { InfraSources } from '../sources';
import { InfraConfig } from '../../../../../../plugins/infra/server';
import { CoreSetup } from '../../../../../../../src/core/server';
import { InfraServerPluginDeps } from '../adapters/framework/adapter_types';

export function compose(core: CoreSetup, config: InfraConfig, plugins: InfraServerPluginDeps) {
  const framework = new KibanaFramework(core, config, plugins);
  const sources = new InfraSources({
    config,
  });
  const sourceStatus = new InfraSourceStatus(new InfraElasticsearchSourceStatusAdapter(framework), {
    sources,
  });
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

  const libs: InfraBackendLibs = {
    configuration: config, // NP_TODO: Do we ever use this anywhere?
    framework,
    logAnalysis,
    snapshot,
    sources,
    sourceStatus,
    ...domainLibs,
  };

  return libs;
}
