/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installationStatuses } from '../../../../../../../../common/constants';
import type { PackageListItem } from '../../../../../types';

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

const group = pkg('nginx_group', {
  title: 'Nginx',
  schemas: {
    otel: { package: 'nginx_otel_integration', default: true },
    ecs: { package: 'nginx' },
  },
});

const params = {
  getHref: jest.fn(
    (page: string, values?: Record<string, unknown>) => `/${page}/${values?.groupName}`
  ),
  getAbsolutePath: (p: string) => p,
  addBasePath: (p: string) => p,
};

describe('applyGroupPackages', () => {
  it('no groups: passes items through', () => {
    const items = [pkg('nginx'), pkg('redis')];
    const res = applyGroupPackages({ items, ...params });
    expect(res.groupCards).toHaveLength(0);
    expect(res.remainingItems).toBe(items);
  });

  it('hides children, emits one group card linking to the group page', () => {
    const res = applyGroupPackages({
      items: [group, pkg('nginx'), pkg('nginx_otel_integration'), pkg('redis')],
      ...params,
    });
    expect(res.remainingItems.map((i) => (i as PackageListItem).name)).toEqual(['redis']);
    expect(res.groupCards).toHaveLength(1);
    expect(res.groupCards[0].title).toBe('Nginx');
    expect(res.groupCards[0].url).toBe('/integration_group/nginx_group');
    expect(res.groupCards[0].installStatus).toBeUndefined();
  });

  it("hides children's input/content deps unless something else requires them", () => {
    const otelChild = pkg('nginx_otel_integration', {
      requires: {
        input: [
          { package: 'nginx_otel_input', version: '0.2.2' },
          { package: 'filelog_otel', version: '0.2.0' },
        ],
        content: [{ package: 'nginx_otel', version: '0.7.0' }],
      },
    });
    const other = pkg('apache_otel', {
      requires: { input: [{ package: 'filelog_otel', version: '0.2.0' }] },
    });
    const res = applyGroupPackages({
      items: [
        group,
        pkg('nginx'),
        otelChild,
        pkg('nginx_otel_input'),
        pkg('nginx_otel'),
        pkg('filelog_otel'),
        other,
      ],
      ...params,
    });
    expect(res.remainingItems.map((i) => (i as PackageListItem).name)).toEqual([
      'filelog_otel',
      'apache_otel',
    ]);
  });

  it('skips schemas whose package is not listed, and groups with none listed', () => {
    const otelOnly = applyGroupPackages({
      items: [group, pkg('nginx_otel_integration')],
      ...params,
    });
    expect(otelOnly.groupCards.map((c) => c.title)).toEqual(['Nginx']);
    const none = applyGroupPackages({ items: [group, pkg('redis')], ...params });
    expect(none.groupCards).toHaveLength(0);
    expect(none.remainingItems.map((i) => (i as PackageListItem).name)).toEqual(['redis']);
  });

  it('derives installed state from children', () => {
    const items = [group, pkg('nginx', installed), pkg('nginx_otel_integration')];
    expect(getInstalledGroupSchemas(group, items)).toEqual(['ecs']);
    const res = applyGroupPackages({ items, ...params });
    expect(res.groupCards[0].installStatus).toBe(installationStatuses.Installed);
  });

  it('labels', () => {
    expect(getGroupInstalledLabel([])).toBeUndefined();
    expect(getGroupInstalledLabel(['ecs'])).toBe('Installed, ECS');
    expect(getGroupInstalledLabel(['otel'])).toBe('Installed, OTel');
    expect(getGroupInstalledLabel(['ecs', 'otel'])).toBe('Installed, ECS + OTel');
  });

  // PROTOTYPE: second group with no Kibana changes. Package list as served by the local registry
  // on 2026-10-21 (apache_group + children built locally; Spark/Tomcat proxied from upstream EPR,
  // which still tags them `group: apache`).
  it('Apache: group tile, but the OTel content pack and the static Apache collection remain', () => {
    const apacheGroup = pkg('apache_group', {
      title: 'Apache HTTP Server',
      schemas: {
        otel: { package: 'apache_input_otel', default: true },
        ecs: { package: 'apache' },
      },
    });
    const items = [
      apacheGroup,
      pkg('apache', { title: 'Apache HTTP Server' }),
      pkg('apache_input_otel', { type: 'input', title: 'Apache HTTP Server (OpenTelemetry)' }),
      pkg('apache_otel', { type: 'content', title: 'Apache OpenTelemetry Assets' }),
      pkg('apache_spark', { group: 'apache', title: 'Apache Spark' }),
      pkg('apache_tomcat', { group: 'apache', title: 'Apache Tomcat' }),
      pkg('apache_tomcat_otel', {
        type: 'content',
        group: 'apache',
        title: 'Apache Tomcat OpenTelemetry Assets',
      }),
    ];
    const { groupCards, remainingItems } = applyGroupPackages({ items, ...params });
    const { collectionCards, ungroupedItems } = applyGrouping({ items: remainingItems, ...params });
    expect(groupCards.map((c) => c.title)).toEqual(['Apache HTTP Server']);
    // Input packages can't declare requires.content, so nothing links apache_otel to the group.
    expect(ungroupedItems.map((i) => (i as PackageListItem).name)).toEqual(['apache_otel']);
    // INTEGRATION_GROUPS.apache ("Apache technologies") still collects the upstream packages.
    expect(collectionCards.map((c) => [c.title, c.groupMembers?.map((m) => m.name)])).toEqual([
      ['Apache', ['apache_spark', 'apache_tomcat', 'apache_tomcat_otel']],
    ]);
  });
});
