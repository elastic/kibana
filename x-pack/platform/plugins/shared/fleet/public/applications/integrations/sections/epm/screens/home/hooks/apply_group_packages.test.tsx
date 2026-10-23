/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installationStatuses } from '../../../../../../../../common/constants';
import type { IntegrationGroup, PackageListItem } from '../../../../../types';

import {
  applyGroupPackages,
  getInstalledGroupSchemas,
  getGroupInstalledLabel,
} from './apply_group_packages';
import { applyGrouping } from './apply_grouping';

jest.mock('../card_utils', () => ({
  mapToCard: ({ item }: { item: PackageListItem }) => ({
    id: `epr:${item.id}`,
    name: item.name,
    title: item.title,
    description: item.description || '',
    url: `/detail/${item.id}`,
    categories: [],
    icons: [],
  }),
}));

const pkg = (name: string, extra: Record<string, unknown> = {}) =>
  ({
    id: name,
    name,
    title: name,
    type: 'integration',
    version: '1.0.0',
    ...extra,
  } as unknown as PackageListItem);

const installed = { installationInfo: { install_status: installationStatuses.Installed } };

const group: IntegrationGroup = {
  name: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx web servers.',
  icon: 'nginx_otel',
  schemas: {
    otel: { package: 'nginx_otel', default: true },
    ecs: { package: 'nginx' },
  },
};

const params = {
  getHref: jest.fn(
    (page: string, values?: Record<string, unknown>) => `/${page}/${values?.groupName}`
  ),
  getAbsolutePath: (p: string) => p,
  addBasePath: (p: string) => p,
};

const names = (items: Array<PackageListItem | unknown>) =>
  items.map((i) => (i as PackageListItem).name);

describe('applyGroupPackages', () => {
  it('no groups: passes items through', () => {
    const items = [pkg('nginx'), pkg('redis')];
    const res = applyGroupPackages({ items, groups: [], ...params });
    expect(res.groupCards).toHaveLength(0);
    expect(res.remainingItems).toBe(items);
  });

  it('one tile per group from the API, member packages hidden', () => {
    const otel = pkg('nginx_otel', {
      icons: [{ src: '/img/logo.svg', type: 'image/svg+xml' }],
    });
    const res = applyGroupPackages({
      items: [pkg('nginx'), otel, pkg('redis')],
      groups: [group],
      ...params,
    });
    expect(names(res.remainingItems)).toEqual(['redis']);
    expect(res.groupCards).toHaveLength(1);
    const [card] = res.groupCards;
    expect(card).toMatchObject({
      id: 'group:nginx',
      name: 'nginx',
      title: 'Nginx',
      description: 'Collect logs and metrics from Nginx web servers.',
      url: '/integration_group/nginx',
      isIntegrationGroupCard: true,
      installStatus: undefined,
    });
    // Icon of the `icon` member, by absolute path
    expect(card.icons).toEqual([
      { src: '', path: '/package/nginx_otel/1.0.0/img/logo.svg', type: 'image/svg+xml' },
    ]);
    expect(card.searchableContent).toContain('nginx_otel');
  });

  it('skips schemas whose package is not listed, and groups with none listed', () => {
    const ecsOnly = applyGroupPackages({ items: [pkg('nginx')], groups: [group], ...params });
    expect(ecsOnly.groupCards.map((c) => c.title)).toEqual(['Nginx']);
    expect(ecsOnly.remainingItems).toEqual([]);
    const none = applyGroupPackages({ items: [pkg('redis')], groups: [group], ...params });
    expect(none.groupCards).toHaveLength(0);
    expect(names(none.remainingItems)).toEqual(['redis']);
  });

  it('derives installed state from members', () => {
    const items = [pkg('nginx', installed), pkg('nginx_otel')];
    expect(getInstalledGroupSchemas(group, items)).toEqual(['ecs']);
    const res = applyGroupPackages({ items, groups: [group], ...params });
    expect(res.groupCards[0].installStatus).toBe(installationStatuses.Installed);
  });

  it('labels', () => {
    expect(getGroupInstalledLabel([])).toBeUndefined();
    expect(getGroupInstalledLabel(['ecs'])).toBe('Installed, ECS');
    expect(getGroupInstalledLabel(['otel'])).toBe('Installed, OTel');
    expect(getGroupInstalledLabel(['ecs', 'otel'])).toBe('Installed, ECS + OTel');
  });

  // PROTOTYPE: second group with no Kibana changes. Spark/Tomcat still carry the static
  // `group: apache` upstream, so the static Apache collection stays next to the group tile.
  it('Apache: group tile and the static Apache collection', () => {
    const apacheGroup: IntegrationGroup = {
      name: 'apache',
      title: 'Apache HTTP Server',
      icon: 'apache',
      schemas: { otel: { package: 'apache_otel', default: true }, ecs: { package: 'apache' } },
    };
    const items = [
      pkg('apache', { title: 'Apache HTTP Server' }),
      pkg('apache_otel', { title: 'Apache HTTP Server OpenTelemetry' }),
      pkg('apache_spark', { group: 'apache', title: 'Apache Spark' }),
      pkg('apache_tomcat', { group: 'apache', title: 'Apache Tomcat' }),
      pkg('apache_tomcat_otel', {
        type: 'content',
        group: 'apache',
        title: 'Apache Tomcat OpenTelemetry Assets',
      }),
    ];
    const { groupCards, remainingItems } = applyGroupPackages({
      items,
      groups: [apacheGroup],
      ...params,
    });
    const { collectionCards, ungroupedItems } = applyGrouping({ items: remainingItems, ...params });
    expect(groupCards.map((c) => c.title)).toEqual(['Apache HTTP Server']);
    expect(ungroupedItems).toEqual([]);
    // INTEGRATION_GROUPS.apache ("Apache technologies") still collects the upstream packages.
    expect(collectionCards.map((c) => [c.title, c.groupMembers?.map((m) => m.name)])).toEqual([
      ['Apache', ['apache_spark', 'apache_tomcat', 'apache_tomcat_otel']],
    ]);
  });
});
