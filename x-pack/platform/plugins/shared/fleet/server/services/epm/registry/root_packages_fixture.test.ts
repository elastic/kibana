/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrySearchResults } from '../../../types';

import { withRootPackagesFixture } from './root_packages_fixture';

const nginx = {
  name: 'nginx',
  version: '3.2.2',
  title: 'Nginx',
  icons: [
    { src: '/img/logo.svg', path: '/package/nginx/3.2.2/img/logo.svg', type: 'image/svg+xml' },
  ],
} as unknown as RegistrySearchResults[number];

describe('withRootPackagesFixture', () => {
  it('adds nginx_group with schemas and nginx icon path', () => {
    const res = withRootPackagesFixture([nginx]);
    const root = res.find((p) => p.name === 'nginx_group')!;
    expect(root.schemas?.default).toBe('otel');
    expect(root.icons?.[0]).toMatchObject({ src: '', path: '/package/nginx/3.2.2/img/logo.svg' });
  });

  it('is a no-op when the registry already serves the root', () => {
    const items = [nginx, { ...nginx, name: 'nginx_group' }];
    expect(withRootPackagesFixture(items)).toBe(items);
  });

  it('is a no-op when nginx is absent', () => {
    expect(withRootPackagesFixture([])).toEqual([]);
  });
});
