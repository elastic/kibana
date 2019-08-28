/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { Authentications } from '../authentications';
import { ElasticsearchAuthenticationAdapter } from '../authentications/elasticsearch_adapter';
import { KibanaConfigurationAdapter } from '../configuration/kibana_configuration_adapter';
import { ElasticsearchEventsAdapter, Events } from '../events';
import { KibanaBackendFrameworkAdapter } from '../framework/kibana_framework_adapter';
import { ElasticsearchHostsAdapter, Hosts } from '../hosts';
import { KpiHosts } from '../kpi_hosts';
import { ElasticsearchKpiHostsAdapter } from '../kpi_hosts/elasticsearch_adapter';

import { ElasticsearchIndexFieldAdapter, IndexFields } from '../index_fields';
import { ElasticsearchIpOverviewAdapter, IpDetails } from '../ip_details';
import { KpiNetwork } from '../kpi_network';
import { ElasticsearchKpiNetworkAdapter } from '../kpi_network/elasticsearch_adapter';
import { ElasticsearchNetworkAdapter, Network } from '../network';
import { Overview } from '../overview';
import { ElasticsearchOverviewAdapter } from '../overview/elasticsearch_adapter';
import { ElasticsearchSourceStatusAdapter, SourceStatus } from '../source_status';
import { ConfigurationSourcesAdapter, Sources } from '../sources';
import { AppBackendLibs, AppDomainLibs, Configuration } from '../types';
import { ElasticsearchUncommonProcessesAdapter, UncommonProcesses } from '../uncommon_processes';
import { Note } from '../note/saved_object';
import { PinnedEvent } from '../pinned_event/saved_object';
import { Timeline } from '../timeline/saved_object';

export function compose(server: Server): AppBackendLibs {
  const configuration = new KibanaConfigurationAdapter<Configuration>(server);
  const framework = new KibanaBackendFrameworkAdapter(server);
  const sources = new Sources(new ConfigurationSourcesAdapter(configuration));
  const sourceStatus = new SourceStatus(new ElasticsearchSourceStatusAdapter(framework));

  const timeline = new Timeline({ savedObjects: framework.getSavedObjectsService() });
  const note = new Note({ savedObjects: framework.getSavedObjectsService() });
  const pinnedEvent = new PinnedEvent({ savedObjects: framework.getSavedObjectsService() });

  const domainLibs: AppDomainLibs = {
    authentications: new Authentications(new ElasticsearchAuthenticationAdapter(framework)),
    events: new Events(new ElasticsearchEventsAdapter(framework)),
    fields: new IndexFields(new ElasticsearchIndexFieldAdapter(framework)),
    hosts: new Hosts(new ElasticsearchHostsAdapter(framework)),
    ipDetails: new IpDetails(new ElasticsearchIpOverviewAdapter(framework)),
    kpiHosts: new KpiHosts(new ElasticsearchKpiHostsAdapter(framework)),
    kpiNetwork: new KpiNetwork(new ElasticsearchKpiNetworkAdapter(framework)),
    network: new Network(new ElasticsearchNetworkAdapter(framework)),
    overview: new Overview(new ElasticsearchOverviewAdapter(framework)),
    uncommonProcesses: new UncommonProcesses(new ElasticsearchUncommonProcessesAdapter(framework)),
  };

  const libs: AppBackendLibs = {
    configuration,
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
