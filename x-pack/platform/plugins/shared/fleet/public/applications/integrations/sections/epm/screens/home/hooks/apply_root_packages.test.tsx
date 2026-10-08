/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installationStatuses } from '../../../../../../../../common/constants';
import type { PackageListItem } from '../../../../../types';

import {
  applyRootPackages,
  getInstalledRootSchemas,
  getRootInstalledLabel,
} from './apply_root_packages';

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

const root = pkg('nginx_group', {
  title: 'Nginx',
  schemas: {
    default: 'otel',
    ecs: { requires: { integration: [{ package: 'nginx', version: '^3.0.0' }] } },
    otel: { requires: { integration: [{ package: 'nginx_otel_integ', version: '^0.1.0' }] } },
  },
});

const params = {
  getHref: jest.fn(
    (page: string, values?: Record<string, unknown>) => `/${page}/${values?.rootName}`
  ),
  getAbsolutePath: (p: string) => p,
  addBasePath: (p: string) => p,
};

describe('applyRootPackages', () => {
  it('no roots: passes items through', () => {
    const items = [pkg('nginx'), pkg('redis')];
    const res = applyRootPackages({ items, ...params });
    expect(res.rootCards).toHaveLength(0);
    expect(res.remainingItems).toBe(items);
  });

  it('hides children, emits one root card linking to the root page', () => {
    const res = applyRootPackages({
      items: [root, pkg('nginx'), pkg('nginx_otel_integ'), pkg('redis')],
      ...params,
    });
    expect(res.remainingItems.map((i) => (i as PackageListItem).name)).toEqual(['redis']);
    expect(res.rootCards).toHaveLength(1);
    expect(res.rootCards[0].title).toBe('Nginx');
    expect(res.rootCards[0].url).toBe('/integration_root/nginx_group');
    expect(res.rootCards[0].installStatus).toBeUndefined();
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
    const res = applyRootPackages({
      items: [
        root,
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
    const items = [root, pkg('nginx', installed), pkg('nginx_otel_integ')];
    expect(getInstalledRootSchemas(root, items)).toEqual(['ecs']);
    const res = applyRootPackages({ items, ...params });
    expect(res.rootCards[0].installStatus).toBe(installationStatuses.Installed);
  });

  it('labels', () => {
    expect(getRootInstalledLabel([])).toBeUndefined();
    expect(getRootInstalledLabel(['ecs'])).toBe('Installed, ECS');
    expect(getRootInstalledLabel(['otel'])).toBe('Installed, OTel');
    expect(getRootInstalledLabel(['ecs', 'otel'])).toBe('Installed, ECS + OTel');
  });
});
