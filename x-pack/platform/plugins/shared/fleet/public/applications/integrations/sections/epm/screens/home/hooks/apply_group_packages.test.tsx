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

jest.mock('../card_utils', () => ({
  mapToCard: ({ item }: { item: PackageListItem }) => ({
    id: `epr:${item.id}`,
    name: item.name,
    title: item.title,
    description: item.description || '',
    url: `/detail/${item.id}`,
    categories: [],
    icons: item.icons ?? [],
    version: item.version,
    release: 'beta',
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

const member = (pkgName: string, schema: string) => ({
  package: pkgName,
  version: '1.0.0',
  title: pkgName,
  schema,
});

const group: IntegrationGroup = {
  name: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx web servers.',
  icon: { package: 'nginx_otel', version: '1.0.0', path: 'img/nginx-group.svg' },
  default: 'nginx_otel',
  members: [member('nginx_otel', 'otel'), member('nginx', 'ecs')],
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

const oneTemplate = { policy_templates: [{ name: 'default', title: 'Default' }] };

describe('applyGroupPackages', () => {
  it('no groups and no groups of one: passes items through', () => {
    const items = [pkg('nginx'), pkg('redis')];
    const res = applyGroupPackages({ items, groups: [], ...params });
    expect(res.groupCards).toHaveLength(0);
    expect(res.remainingItems).toBe(items);
  });

  it('one tile per group, member packages hidden', () => {
    const res = applyGroupPackages({
      items: [pkg('nginx'), pkg('nginx_otel'), pkg('redis')],
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
      release: undefined,
    });
    expect(card.searchableContent).toContain('nginx_otel');
  });

  it('group icon from group.yml, by absolute path in the default member', () => {
    const [card] = applyGroupPackages({
      items: [pkg('nginx'), pkg('nginx_otel')],
      groups: [group],
      ...params,
    }).groupCards;
    expect(card.icons).toEqual([
      {
        src: '',
        path: '/package/nginx_otel/1.0.0/img/nginx-group.svg',
        type: 'image/svg+xml',
      },
    ]);
  });

  it('no group icon: icons of the default member, by absolute path', () => {
    const otel = pkg('nginx_otel', { icons: [{ src: '/img/logo.svg', type: 'image/svg+xml' }] });
    const [card] = applyGroupPackages({
      items: [pkg('nginx'), otel],
      groups: [{ ...group, icon: undefined }],
      ...params,
    }).groupCards;
    expect(card.icons).toEqual([
      { src: '', path: '/package/nginx_otel/1.0.0/img/logo.svg', type: 'image/svg+xml' },
    ]);
  });

  it('skips members that are not listed, and groups with none listed', () => {
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

  it('labels, renamed by the group schema_labels', () => {
    expect(getGroupInstalledLabel([])).toBeUndefined();
    expect(getGroupInstalledLabel(['ecs'])).toBe('Installed, ECS');
    expect(getGroupInstalledLabel(['otel'])).toBe('Installed, OTel');
    expect(getGroupInstalledLabel(['ecs', 'otel'])).toBe('Installed, ECS + OTel');
    expect(getGroupInstalledLabel(['ecs', 'otel'], { schema_labels: { ecs: 'Legacy' } })).toBe(
      'Installed, Legacy + OTel'
    );
  });

  it('bare `group` strings without a group are separate tiles', () => {
    const items = [
      pkg('redis', { group: 'redis', ...oneTemplate }),
      pkg('redis_otel', { group: 'redis', ...oneTemplate }),
    ];
    const res = applyGroupPackages({ items, groups: [group], ...params });
    expect(res.groupCards).toHaveLength(0);
    expect(names(res.remainingItems)).toEqual(['redis', 'redis_otel']);
  });

  describe('groups of one', () => {
    const packages = [
      pkg('supabase', oneTemplate),
      pkg('aws', {
        policy_templates: [
          { name: 'cloudtrail', title: 'CloudTrail' },
          { name: 's3', title: 'S3' },
        ],
      }),
      pkg('prometheus_input', { type: 'input', ...oneTemplate }),
      pkg('old', { deprecated: { description: 'Deprecated' }, ...oneTemplate }),
      pkg('nginx', oneTemplate),
      pkg('nginx_otel', oneTemplate),
    ];
    // Catalog tiles: `policy_templates` stripped, multi-template packages flattened
    const items = [
      pkg('supabase'),
      pkg('aws'),
      pkg('aws', { id: 'aws-cloudtrail', integration: 'cloudtrail' }),
      pkg('aws', { id: 'aws-s3', integration: 's3' }),
      pkg('prometheus_input', { type: 'input' }),
      pkg('old'),
      pkg('nginx'),
      pkg('nginx_otel'),
    ];

    it('single-template integration packages open the wizard, the rest stay stock', () => {
      const res = applyGroupPackages({ items, groups: [group], packages, ...params });
      expect(res.groupCards.map((c) => c.id)).toEqual(['group:nginx', 'epr:supabase']);
      expect(res.remainingItems.map((i) => (i as PackageListItem).id)).toEqual([
        'aws',
        'aws-cloudtrail',
        'aws-s3',
        'prometheus_input',
        'old',
      ]);
    });

    it('keeps the stock card, pointed at the wizard', () => {
      const res = applyGroupPackages({ items, groups: [], packages, ...params });
      const supabase = res.groupCards.find((c) => c.name === 'supabase');
      expect(supabase).toEqual({
        id: 'epr:supabase',
        name: 'supabase',
        title: 'supabase',
        description: '',
        url: '/integration_group/supabase',
        categories: [],
        icons: [],
        version: '1.0.0',
        release: 'beta',
        isIntegrationGroupCard: true,
      });
      // Without groups, nginx members are groups of one too
      expect(res.groupCards.map((c) => c.name)).toEqual(['supabase', 'nginx', 'nginx_otel']);
    });
  });
});
