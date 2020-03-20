/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, SetupPlugins } from '../../plugin';

import { Authentications } from '../authentications';
import { ElasticsearchAuthenticationAdapter } from '../authentications/elasticsearch_adapter';
import { ElasticsearchEventsAdapter, Events } from '../events';
import { KibanaBackendFrameworkAdapter } from '../framework/kibana_framework_adapter';
import { ElasticsearchHostsAdapter, Hosts } from '../hosts';
import { KpiHosts } from '../kpi_hosts';
import { ElasticsearchKpiHostsAdapter } from '../kpi_hosts/elasticsearch_adapter';

import { ElasticsearchIndexFieldAdapter, IndexFields } from '../index_fields';
import { ElasticsearchIpDetailsAdapter, IpDetails } from '../ip_details';
import { ElasticsearchTlsAdapter, TLS } from '../tls';

import { KpiNetwork } from '../kpi_network';
import { ElasticsearchKpiNetworkAdapter } from '../kpi_network/elasticsearch_adapter';
import { ElasticsearchNetworkAdapter, Network } from '../network';
import { Overview } from '../overview';
import { ElasticsearchOverviewAdapter } from '../overview/elasticsearch_adapter';
import { ElasticsearchSourceStatusAdapter, SourceStatus } from '../source_status';
import { ConfigurationSourcesAdapter, Sources } from '../sources';
import { AppBackendLibs, AppDomainLibs } from '../types';
import { ElasticsearchUncommonProcessesAdapter, UncommonProcesses } from '../uncommon_processes';
import { Note } from '../note/saved_object';
import { PinnedEvent } from '../pinned_event/saved_object';
import { Timeline } from '../timeline/saved_object';
import { ElasticsearchMatrixHistogramAdapter, MatrixHistogram } from '../matrix_histogram';

export function compose(
  core: CoreSetup,
  plugins: SetupPlugins,
  isProductionMode: boolean
): AppBackendLibs {
  const framework = new KibanaBackendFrameworkAdapter(core, plugins, isProductionMode);
  const sources = new Sources(new ConfigurationSourcesAdapter());
  const sourceStatus = new SourceStatus(new ElasticsearchSourceStatusAdapter(framework));

  const timeline = new Timeline();
  const note = new Note();
  const pinnedEvent = new PinnedEvent();

  const domainLibs: AppDomainLibs = {
    authentications: new Authentications(new ElasticsearchAuthenticationAdapter(framework)),
    events: new Events(new ElasticsearchEventsAdapter(framework)),
    fields: new IndexFields(new ElasticsearchIndexFieldAdapter(framework)),
    hosts: new Hosts(new ElasticsearchHostsAdapter(framework)),
    ipDetails: new IpDetails(new ElasticsearchIpDetailsAdapter(framework)),
    tls: new TLS(new ElasticsearchTlsAdapter(framework)),
    kpiHosts: new KpiHosts(new ElasticsearchKpiHostsAdapter(framework)),
    kpiNetwork: new KpiNetwork(new ElasticsearchKpiNetworkAdapter(framework)),
    matrixHistogram: new MatrixHistogram(new ElasticsearchMatrixHistogramAdapter(framework)),
    network: new Network(new ElasticsearchNetworkAdapter(framework)),
    overview: new Overview(new ElasticsearchOverviewAdapter(framework)),
    uncommonProcesses: new UncommonProcesses(new ElasticsearchUncommonProcessesAdapter(framework)),
  };

  const libs: AppBackendLibs = {
    framework,
    sourceStatus,
    sources,
    ...domainLibs,
    timeline,
    note,
    pinnedEvent,
  };

  return libs;
}
