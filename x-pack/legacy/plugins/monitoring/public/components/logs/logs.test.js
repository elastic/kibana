/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Logs } from './logs';

jest.mock('../../np_imports/ui/chrome', () => {
  return {
    getBasePath: () => '',
  };
});

jest.mock(
  '../../np_imports/ui/capabilities',
  () => ({
    capabilities: {
      get: () => ({ logs: { show: true } }),
    },
  }),
  { virtual: true }
);

const logs = {
  enabled: true,
  limit: 10,
  logs: [
    {
      timestamp: '2019-03-18T12:49:33.783Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
    {
      timestamp: '2019-03-18T12:49:26.781Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
    {
      timestamp: '2019-03-18T12:49:24.414Z',
      component: 'o.e.c.r.a.DiskThresholdMonitor',
      level: 'WARN',
      type: 'server',
      node: 'foobar2',
      message:
        'high disk watermark [90%] exceeded on [-pH5RhfsRl6FDeTPwD5vEw][Elastic-MBP.local][/Users/chris/Development/repos/kibana/.es/8.0.0/data/nodes/0] free: 29.5gb[6.3%], shards will be relocated away from this node',
    },
    {
      timestamp: '2019-03-18T12:49:24.414Z',
      component: 'o.e.c.r.a.DiskThresholdMonitor',
      level: 'INFO',
      type: 'server',
      node: 'foobar',
      message: 'rerouting shards: [high disk watermark exceeded on one or more nodes]',
    },
    {
      timestamp: '2019-03-18T12:49:11.776Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
    {
      timestamp: '2019-03-18T12:49:08.770Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
    {
      timestamp: '2019-03-18T12:48:59.409Z',
      component: 'o.e.c.r.a.DiskThresholdMonitor',
      level: 'WARN',
      type: 'server',
      node: 'foobar',
      message:
        'high disk watermark [90%] exceeded on [-pH5RhfsRl6FDeTPwD5vEw][Elastic-MBP.local][/Users/chris/Development/repos/kibana/.es/8.0.0/data/nodes/0] free: 29.3gb[6.2%], shards will be relocated away from this node',
    },
    {
      timestamp: '2019-03-18T12:48:53.753Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
    {
      timestamp: '2019-03-18T12:48:53.753Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
    {
      timestamp: '2019-03-18T12:48:46.745Z',
      component: 'o.e.d.x.m.r.a.RestMonitoringBulkAction',
      level: 'WARN',
      type: 'deprecation',
      node: 'foobar2',
      message:
        '[POST /_xpack/monitoring/_bulk] is deprecated! Use [POST /_monitoring/bulk] instead.',
    },
  ],
};

describe('Logs', () => {
  it('should render normally', () => {
    const component = shallow(<Logs logs={logs} />);
    expect(component).toMatchSnapshot();
  });

  it('should render fewer columns for node or index view', () => {
    const component = shallow(<Logs logs={logs} nodeId="12345" />);
    expect(component.find('EuiBasicTable').prop('columns')).toMatchSnapshot();
  });

  it('should render a link to filter by cluster uuid', () => {
    const component = shallow(<Logs logs={logs} clusterUuid="12345" />);
    expect(component.find('EuiCallOut')).toMatchSnapshot();
  });

  it('should render a link to filter by cluster uuid and node uuid', () => {
    const component = shallow(<Logs logs={logs} clusterUuid="12345" nodeId="6789" />);
    expect(component.find('EuiCallOut')).toMatchSnapshot();
  });

  it('should render a link to filter by cluster uuid and index uuid', () => {
    const component = shallow(<Logs logs={logs} clusterUuid="12345" indexUuid="6789" />);
    expect(component.find('EuiCallOut')).toMatchSnapshot();
  });

  it('should render a reason if the logs are disabled', () => {
    const component = shallow(<Logs logs={{ enabled: false, limit: 15, reason: {} }} />);
    expect(component).toMatchSnapshot();
  });
});
