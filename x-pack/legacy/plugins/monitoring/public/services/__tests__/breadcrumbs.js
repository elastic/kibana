/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { breadcrumbsProvider } from '../breadcrumbs_provider';
import { MonitoringMainController } from 'plugins/monitoring/directives/main';

describe('Monitoring Breadcrumbs Service', () => {
  it('in Cluster Alerts', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: {},
      breadcrumbsService: breadcrumbsProvider(),
      attributes: {
        name: 'alerts',
      },
    });
    expect(controller.breadcrumbs).to.eql([
      { url: '#/home', label: 'Clusters', testSubj: 'breadcrumbClusters' },
      { url: '#/overview', label: 'test-cluster-foo' },
    ]);
  });

  it('in Cluster Overview', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: {},
      breadcrumbsService: breadcrumbsProvider(),
      attributes: {
        name: 'overview',
      },
    });
    expect(controller.breadcrumbs).to.eql([
      { url: '#/home', label: 'Clusters', testSubj: 'breadcrumbClusters' },
    ]);
  });

  it('in ES Node - Advanced', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: {},
      breadcrumbsService: breadcrumbsProvider(),
      attributes: {
        product: 'elasticsearch',
        name: 'nodes',
        instance: 'es-node-name-01',
        resolver: 'es-node-resolver-01',
        page: 'advanced',
        tabIconClass: 'fa star',
        tabIconLabel: 'Master Node',
      },
    });
    expect(controller.breadcrumbs).to.eql([
      { url: '#/home', label: 'Clusters', testSubj: 'breadcrumbClusters' },
      { url: '#/overview', label: 'test-cluster-foo' },
      { url: '#/elasticsearch', label: 'Elasticsearch' },
      { url: '#/elasticsearch/nodes', label: 'Nodes', testSubj: 'breadcrumbEsNodes' },
      { url: null, label: 'es-node-name-01' },
    ]);
  });

  it('in Kibana Overview', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: {},
      breadcrumbsService: breadcrumbsProvider(),
      attributes: {
        product: 'kibana',
        name: 'overview',
      },
    });
    expect(controller.breadcrumbs).to.eql([
      { url: '#/home', label: 'Clusters', testSubj: 'breadcrumbClusters' },
      { url: '#/overview', label: 'test-cluster-foo' },
      { url: null, label: 'Kibana' },
    ]);
  });

  /**
   * <monitoring-main product="logstash" name="nodes">
   */
  it('in Logstash Listing', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: {},
      breadcrumbsService: breadcrumbsProvider(),
      attributes: {
        product: 'logstash',
        name: 'listing',
      },
    });
    expect(controller.breadcrumbs).to.eql([
      { url: '#/home', label: 'Clusters', testSubj: 'breadcrumbClusters' },
      { url: '#/overview', label: 'test-cluster-foo' },
      { url: null, label: 'Logstash' },
    ]);
  });

  /**
   * <monitoring-main product="logstash" page="pipeline">
   */
  it('in Logstash Pipeline Viewer', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: {},
      breadcrumbsService: breadcrumbsProvider(),
      attributes: {
        product: 'logstash',
        page: 'pipeline',
        pipelineId: 'main',
        pipelineHash: '42ee890af9...',
      },
    });
    expect(controller.breadcrumbs).to.eql([
      { url: '#/home', label: 'Clusters', testSubj: 'breadcrumbClusters' },
      { url: '#/overview', label: 'test-cluster-foo' },
      { url: '#/logstash', label: 'Logstash' },
      { url: '#/logstash/pipelines', label: 'Pipelines' },
    ]);
  });
});
