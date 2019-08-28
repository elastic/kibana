/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../public/graphql/types';
import { InfraConfigurationAdapter } from './adapters/configuration';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from './adapters/framework';
import { InfraFieldsDomain } from './domains/fields_domain';
import { InfraLogEntriesDomain } from './domains/log_entries_domain';
import { InfraMetricsDomain } from './domains/metrics_domain';
import { InfraLogAnalysis } from './log_analysis/log_analysis';
import { InfraSnapshot } from './snapshot';
import { InfraSources } from './sources';
import { InfraSourceStatus } from './source_status';

export interface InfraDomainLibs {
  fields: InfraFieldsDomain;
  logEntries: InfraLogEntriesDomain;
  metrics: InfraMetricsDomain;
}

export interface InfraBackendLibs extends InfraDomainLibs {
  configuration: InfraConfigurationAdapter;
  framework: InfraBackendFrameworkAdapter;
  logAnalysis: InfraLogAnalysis;
  snapshot: InfraSnapshot;
  sources: InfraSources;
  sourceStatus: InfraSourceStatus;
}

export interface InfraConfiguration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: {
    default: InfraSourceConfiguration;
  };
}

export interface InfraContext {
  req: InfraFrameworkRequest;
}
