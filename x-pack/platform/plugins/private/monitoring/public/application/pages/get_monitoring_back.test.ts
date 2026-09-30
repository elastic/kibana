/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitoringBack } from './get_monitoring_back';

const createHref = (route: string) => `#${route}`;

describe('getMonitoringBack', () => {
  it('returns no back on listing and setup routes', () => {
    expect(getMonitoringBack('/home', createHref)).toBeUndefined();
    expect(getMonitoringBack('/no-data', createHref)).toBeUndefined();
    expect(getMonitoringBack('/loading', createHref)).toBeUndefined();
  });

  it('hides clusters back when the listing would redirect away', () => {
    expect(getMonitoringBack('/overview', createHref)).toBeUndefined();
    expect(getMonitoringBack('/license', createHref)).toBeUndefined();
  });

  it('goes one step from cluster overview to clusters when listing is available', () => {
    expect(getMonitoringBack('/overview', createHref, { hasClusterListing: true })).toEqual({
      href: '#/home',
      label: 'Clusters',
    });
  });

  it('goes one step from product tabs to cluster overview', () => {
    expect(getMonitoringBack('/elasticsearch/nodes', createHref)?.label).toBe('Cluster overview');
    expect(getMonitoringBack('/kibana', createHref)?.href).toBe('#/overview');
  });

  it('goes one step from instance pages to their list', () => {
    expect(getMonitoringBack('/elasticsearch/nodes/abc', createHref)).toEqual({
      href: '#/elasticsearch/nodes',
      label: 'Nodes',
    });
    expect(getMonitoringBack('/kibana/instances/k1', createHref)?.label).toBe('Instances');
    expect(getMonitoringBack('/logstash/pipelines/main', createHref)?.label).toBe('Pipelines');
  });

  it('goes one step from nested node views to node overview', () => {
    expect(getMonitoringBack('/elasticsearch/nodes/abc/advanced', createHref)).toEqual({
      href: '#/elasticsearch/nodes/abc',
      label: 'Node overview',
    });
    expect(getMonitoringBack('/logstash/node/uuid/pipelines', createHref)?.href).toBe(
      '#/logstash/node/uuid'
    );
  });
});
