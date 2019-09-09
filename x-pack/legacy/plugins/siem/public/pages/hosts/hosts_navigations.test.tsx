/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsTableType } from '../../store/hosts/model';
import { navTabsHosts, navTabsHostDetails } from './hosts_navigations';

describe('navTabsHosts', () => {
  test('it should skip anomalies tab if without mlUserPermission', () => {
    const tabs = navTabsHosts(false);
    expect(tabs).toHaveProperty(HostsTableType.hosts);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });

  test('it should display anomalies tab if with mlUserPermission', () => {
    const tabs = navTabsHosts(true);
    expect(tabs).toHaveProperty(HostsTableType.hosts);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });
});

describe('navTabsHostDetails', () => {
  const mockHostName = 'mockHostName';
  test('it should skip anomalies tab if without mlUserPermission', () => {
    const tabs = navTabsHostDetails(mockHostName, false);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).not.toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });

  test('it should display anomalies tab if with mlUserPermission', () => {
    const tabs = navTabsHostDetails(mockHostName, true);
    expect(tabs).toHaveProperty(HostsTableType.authentications);
    expect(tabs).toHaveProperty(HostsTableType.uncommonProcesses);
    expect(tabs).toHaveProperty(HostsTableType.anomalies);
    expect(tabs).toHaveProperty(HostsTableType.events);
  });
});
