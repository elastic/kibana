/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { InfraKibanaConfigurationAdapter } from '../adapters/configuration/kibana_configuration_adapter';
import { FrameworkFieldsAdapter } from '../adapters/fields/framework_fields_adapter';
import { InfraKibanaBackendFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from '../adapters/log_entries/kibana_log_entries_adapter';
import { ElasticsearchMetadataAdapter } from '../adapters/metadata/elasticsearch_metadata_adapter';
import { KibanaMetricsAdapter } from '../adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from '../adapters/source_status';
import { InfraFieldsDomain } from '../domains/fields_domain';
import { InfraLogEntriesDomain } from '../domains/log_entries_domain';
import { InfraMetadataDomain } from '../domains/metadata_domain';
import { InfraMetricsDomain } from '../domains/metrics_domain';
import { InfraBackendLibs, InfraDomainLibs } from '../infra_types';
import { InfraSnapshot } from '../snapshot';
import { InfraSourceStatus } from '../source_status';
import { InfraSources } from '../sources';

export function compose(server: Server): InfraBackendLibs {
  const configuration = new InfraKibanaConfigurationAdapter(server);
  const framework = new InfraKibanaBackendFrameworkAdapter(server);
  const sources = new InfraSources({
    configuration,
    savedObjects: framework.getSavedObjectsService(),
  });
  const sourceStatus = new InfraSourceStatus(new InfraElasticsearchSourceStatusAdapter(framework), {
    sources,
  });
  const snapshot = new InfraSnapshot({ sources, framework });

  const domainLibs: InfraDomainLibs = {
    metadata: new InfraMetadataDomain(new ElasticsearchMetadataAdapter(framework), {
      sources,
    }),
    fields: new InfraFieldsDomain(new FrameworkFieldsAdapter(framework), {
      sources,
    }),
    logEntries: new InfraLogEntriesDomain(new InfraKibanaLogEntriesAdapter(framework), {
      sources,
    }),
    metrics: new InfraMetricsDomain(new KibanaMetricsAdapter(framework)),
  };

  const libs: InfraBackendLibs = {
    configuration,
    framework,
    snapshot,
    sources,
    sourceStatus,
    ...domainLibs,
  };

  return libs;
}
