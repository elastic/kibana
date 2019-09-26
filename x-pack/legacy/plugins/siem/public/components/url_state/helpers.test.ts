/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { navTabs, SiemPageName } from '../../pages/home/home_navigations';
import { isKqlForRoute, getTitle } from './helpers';
import { CONSTANTS } from './constants';
import { HostsType } from '../../store/hosts/model';

describe('Helpers Url_State', () => {
  describe('isKqlForRoute', () => {
    test('host page and host page kuery', () => {
      const result = isKqlForRoute(SiemPageName.hosts, undefined, CONSTANTS.hostsPage);
      expect(result).toBeTruthy();
    });
    test('host page and host details kuery', () => {
      const result = isKqlForRoute(SiemPageName.hosts, undefined, CONSTANTS.hostsDetails);
      expect(result).toBeFalsy();
    });
    test('host details and host details kuery', () => {
      const result = isKqlForRoute(SiemPageName.hosts, 'siem-kibana', CONSTANTS.hostsDetails);
      expect(result).toBeTruthy();
    });
    test('host details and host page kuery', () => {
      const result = isKqlForRoute(SiemPageName.hosts, 'siem-kibana', CONSTANTS.hostsPage);
      expect(result).toBeFalsy();
    });
    test('network page and network page kuery', () => {
      const result = isKqlForRoute(SiemPageName.network, undefined, CONSTANTS.networkPage);
      expect(result).toBeTruthy();
    });
    test('network page and network details kuery', () => {
      const result = isKqlForRoute(SiemPageName.network, undefined, CONSTANTS.networkDetails);
      expect(result).toBeFalsy();
    });
    test('network details and network details kuery', () => {
      const result = isKqlForRoute(SiemPageName.network, '10.100.7.198', CONSTANTS.networkDetails);
      expect(result).toBeTruthy();
    });
    test('network details and network page kuery', () => {
      const result = isKqlForRoute(SiemPageName.network, '123.234.34', CONSTANTS.networkPage);
      expect(result).toBeFalsy();
    });
  });
  describe('getTitle', () => {
    test('host page name', () => {
      const result = getTitle('hosts', undefined, navTabs);
      expect(result).toEqual('Hosts');
    });
    test('network page name', () => {
      const result = getTitle('network', undefined, navTabs);
      expect(result).toEqual('Network');
    });
    test('overview page name', () => {
      const result = getTitle('overview', undefined, navTabs);
      expect(result).toEqual('Overview');
    });
    test('timelines page name', () => {
      const result = getTitle('timelines', undefined, navTabs);
      expect(result).toEqual('Timelines');
    });
    test('details page name', () => {
      const result = getTitle('hosts', HostsType.details, navTabs);
      expect(result).toEqual(HostsType.details);
    });
    test('Not existing', () => {
      const result = getTitle('IamHereButNotReally', undefined, navTabs);
      expect(result).toEqual('');
    });
  });
});
