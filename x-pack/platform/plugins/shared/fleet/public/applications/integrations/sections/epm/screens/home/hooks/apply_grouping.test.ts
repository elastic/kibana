/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installationStatuses } from '../../../../../../../../common/constants';
import type { PackageListItem } from '../../../../../types';

import { applyGrouping } from './apply_grouping';

const mockMapToCard = jest.fn();
jest.mock('../card_utils', () => ({
  mapToCard: (...args: unknown[]) => mockMapToCard(...args),
}));

jest.mock('../integration_groups', () => ({
  INTEGRATION_GROUPS: {
    nginx: { title: 'Nginx', description: 'Nginx description', icons: [] },
    redis: { title: 'Redis', description: 'Redis description', icons: [] },
  },
}));

const makePackage = (overrides: Record<string, unknown> = {}): PackageListItem =>
  ({
    id: 'test-pkg',
    name: 'test_pkg',
    title: 'Test Package',
    type: 'integration',
    version: '1.0.0',
    description: 'A test package',
    categories: [],
    ...overrides,
  } as unknown as PackageListItem);

const baseParams = {
  getHref: jest.fn().mockReturnValue('/mock/collection/href'),
  getAbsolutePath: jest.fn((p: string) => p),
  addBasePath: jest.fn((p: string) => p),
};

describe('applyGrouping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    baseParams.getHref.mockReturnValue('/mock/collection/href');
    mockMapToCard.mockImplementation(({ item }: { item: PackageListItem }) => ({
      id: `epr:${item.id}`,
      name: item.name,
      title: item.title,
      description: item.description || '',
      url: `/detail/${item.id}`,
      categories: (item.categories as string[]) || [],
    }));
  });

  it('returns empty results for empty input', () => {
    const result = applyGrouping({ items: [], ...baseParams });
    expect(result.collectionCards).toHaveLength(0);
    expect(result.ungroupedItems).toHaveLength(0);
  });

  it('passes custom integrations (ui_link type) directly to ungroupedItems', () => {
    const customInt = { type: 'ui_link', id: 'custom-1' } as unknown as PackageListItem;
    const result = applyGrouping({ items: [customInt], ...baseParams });
    expect(result.collectionCards).toHaveLength(0);
    expect(result.ungroupedItems).toContain(customInt);
  });

  it('passes EPR packages without a group to ungroupedItems', () => {
    const pkg = makePackage({ id: 'pkg-1', name: 'pkg_1' });
    const result = applyGrouping({ items: [pkg], ...baseParams });
    expect(result.collectionCards).toHaveLength(0);
    expect(result.ungroupedItems).toContain(pkg);
  });

  it('passes EPR packages with an unregistered group id to ungroupedItems', () => {
    const pkg = makePackage({ id: 'pkg-1', name: 'pkg_1', group: 'unknown_group' });
    const result = applyGrouping({ items: [pkg], ...baseParams });
    expect(result.collectionCards).toHaveLength(0);
    expect(result.ungroupedItems).toContain(pkg);
  });

  it('falls back to normal tiles when only one unique package name is in a group', () => {
    const pkg = makePackage({ id: 'nginx-1', name: 'nginx', group: 'nginx' });
    const result = applyGrouping({ items: [pkg], ...baseParams });
    expect(result.collectionCards).toHaveLength(0);
    expect(result.ungroupedItems).toContain(pkg);
  });

  it('produces a collection card when two or more unique packages share a group', () => {
    const pkg1 = makePackage({ id: 'nginx-1', name: 'nginx', title: 'Nginx', group: 'nginx' });
    const pkg2 = makePackage({
      id: 'nginx-otel-1',
      name: 'nginx_otel',
      title: 'Nginx OTel',
      group: 'nginx',
    });
    const result = applyGrouping({ items: [pkg1, pkg2], ...baseParams });
    expect(result.collectionCards).toHaveLength(1);
    expect(result.ungroupedItems).toHaveLength(0);
    const [card] = result.collectionCards;
    expect(card.isCollectionCard).toBe(true);
    expect(card.name).toBe('nginx');
    expect(card.groupMembers).toHaveLength(2);
  });

  it('deduplicates members by name so multi-policy-template packages count as one', () => {
    const pkg1 = makePackage({ id: 'nginx-1', name: 'nginx', group: 'nginx' });
    // nginx_otel appears twice (two policy templates expanded), same name → one unique member
    const pkg2a = makePackage({ id: 'nginx-otel-1', name: 'nginx_otel', group: 'nginx' });
    const pkg2b = makePackage({ id: 'nginx-otel-2', name: 'nginx_otel', group: 'nginx' });
    const result = applyGrouping({ items: [pkg1, pkg2a, pkg2b], ...baseParams });
    // nginx + nginx_otel = 2 unique names → collection card with 2 members
    expect(result.collectionCards).toHaveLength(1);
    expect(result.collectionCards[0].groupMembers).toHaveLength(2);
  });

  it('falls back to normal tiles when dedup leaves only one unique name in a group', () => {
    const pkg1 = makePackage({ id: 'nginx-1', name: 'nginx', group: 'nginx' });
    const pkg2 = makePackage({ id: 'nginx-2', name: 'nginx', group: 'nginx' });
    const result = applyGrouping({ items: [pkg1, pkg2], ...baseParams });
    expect(result.collectionCards).toHaveLength(0);
    expect(result.ungroupedItems).toHaveLength(2);
  });

  it('sets installStatus to installed when any member is installed', () => {
    const pkg1 = makePackage({ id: 'nginx-1', name: 'nginx', group: 'nginx' });
    const pkg2 = makePackage({
      id: 'nginx-otel-1',
      name: 'nginx_otel',
      group: 'nginx',
      installationInfo: { install_status: installationStatuses.Installed },
    });
    const result = applyGrouping({ items: [pkg1, pkg2], ...baseParams });
    expect(result.collectionCards[0].installStatus).toBe(installationStatuses.Installed);
  });

  it('leaves installStatus undefined when no member is installed', () => {
    const pkg1 = makePackage({ id: 'nginx-1', name: 'nginx', group: 'nginx' });
    const pkg2 = makePackage({ id: 'nginx-otel-1', name: 'nginx_otel', group: 'nginx' });
    const result = applyGrouping({ items: [pkg1, pkg2], ...baseParams });
    expect(result.collectionCards[0].installStatus).toBeUndefined();
  });

  it('unions member categories on the collection card without duplicates', () => {
    const pkg1 = makePackage({
      id: 'nginx-1',
      name: 'nginx',
      group: 'nginx',
      categories: ['web', 'security'],
    });
    const pkg2 = makePackage({
      id: 'nginx-otel-1',
      name: 'nginx_otel',
      group: 'nginx',
      categories: ['web', 'observability'],
    });
    const result = applyGrouping({ items: [pkg1, pkg2], ...baseParams });
    const { categories } = result.collectionCards[0];
    expect(categories).toContain('web');
    expect(categories).toContain('security');
    expect(categories).toContain('observability');
    expect(categories.filter((c) => c === 'web')).toHaveLength(1);
  });

  it('builds searchableContent from member names, titles, and descriptions', () => {
    const pkg1 = makePackage({
      id: 'nginx-1',
      name: 'nginx',
      title: 'Nginx',
      description: 'A web server',
      group: 'nginx',
    });
    const pkg2 = makePackage({
      id: 'nginx-otel-1',
      name: 'nginx_otel',
      title: 'Nginx OTel',
      description: 'OTel metrics',
      group: 'nginx',
    });
    const result = applyGrouping({ items: [pkg1, pkg2], ...baseParams });
    const { searchableContent } = result.collectionCards[0];
    expect(searchableContent).toContain('nginx');
    expect(searchableContent).toContain('nginx_otel');
    expect(searchableContent).toContain('Nginx');
    expect(searchableContent).toContain('Nginx OTel');
    expect(searchableContent).toContain('A web server');
    expect(searchableContent).toContain('OTel metrics');
  });

  it('produces independent collection cards for separate groups', () => {
    const nginxPkg1 = makePackage({ id: 'nginx-1', name: 'nginx', group: 'nginx' });
    const nginxPkg2 = makePackage({ id: 'nginx-otel-1', name: 'nginx_otel', group: 'nginx' });
    const redisPkg1 = makePackage({ id: 'redis-1', name: 'redis', group: 'redis' });
    const redisPkg2 = makePackage({ id: 'redis-ent-1', name: 'redisenterprise', group: 'redis' });
    const result = applyGrouping({
      items: [nginxPkg1, nginxPkg2, redisPkg1, redisPkg2],
      ...baseParams,
    });
    expect(result.collectionCards).toHaveLength(2);
    expect(result.ungroupedItems).toHaveLength(0);
    const names = result.collectionCards.map((c) => c.name);
    expect(names).toContain('nginx');
    expect(names).toContain('redis');
  });
});
