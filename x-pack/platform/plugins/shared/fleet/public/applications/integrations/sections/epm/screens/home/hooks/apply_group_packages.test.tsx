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
  requires: {
    integration: [
      { package: 'nginx', version: '^3.0.0' },
      { package: 'nginx_otel_integ', version: '^0.1.0' },
    ],
  },
  schemas: {
    otel: { integration: 'nginx_otel_integ', default: true },
    ecs: { integration: 'nginx' },
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
      items: [group, pkg('nginx'), pkg('nginx_otel_integ'), pkg('redis')],
      ...params,
    });
    expect(res.remainingItems.map((i) => (i as PackageListItem).name)).toEqual(['redis']);
    expect(res.groupCards).toHaveLength(1);
    expect(res.groupCards[0].title).toBe('Nginx');
    expect(res.groupCards[0].url).toBe('/integration_group/nginx_group');
    expect(res.groupCards[0].installStatus).toBeUndefined();
  });

  it("hides children's input/content deps unless something else requires them", () => {
    const otelChild = pkg('nginx_otel_integ', {
      requires: {
        input: [
          { package: 'nginx_otel_input', version: '0.2.2' },
          { package: 'filelog_otel', version: '0.2.0' },
        ],
        content: [{ package: 'nginx_otel', version: '0.6.1' }],
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

  it('derives installed state from children', () => {
    const items = [group, pkg('nginx', installed), pkg('nginx_otel_integ')];
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
});
