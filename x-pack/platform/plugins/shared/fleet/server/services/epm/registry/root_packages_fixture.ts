/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE ONLY. Mirrors the contract root manifest (integrations/packages/nginx/manifest.yml)
// so the UI can be built before the registry serves real roots. Enabled with
// `xpack.fleet.enableExperimental: ['rootPackagesFixture']`. Once the registry returns
// `nginx_group` with `schemas`, delete this file and its single call site in ../packages/get.ts.

import type { RegistrySearchResult, RegistrySearchResults } from '../../../types';

const NGINX_GROUP_FIXTURE: RegistrySearchResult = {
  name: 'nginx_group',
  title: 'Nginx',
  version: '0.1.0',
  release: 'ga',
  description: 'Collect logs and metrics from Nginx.',
  type: 'integration',
  download: '/epr/nginx_group/nginx_group-0.1.0.zip',
  path: '/package/nginx_group/0.1.0',
  icons: [],
  categories: ['web', 'observability'],
  schemas: {
    default: 'otel',
    ecs: { requires: { integration: [{ package: 'nginx', version: '^3.0.0' }] } },
    otel: { requires: { integration: [{ package: 'nginx_otel_integ', version: '^0.1.0' }] } },
  },
};

export const withRootPackagesFixture = (items: RegistrySearchResults): RegistrySearchResults => {
  if (items.some((item) => item.name === NGINX_GROUP_FIXTURE.name)) return items;
  // The fixture has no archive in the registry, so borrow nginx's icon by absolute `path`
  // (no `src`), which the UI resolves without using the root's package name.
  const nginx = items.find((item) => item.name === 'nginx');
  // Category-filtered lists that don't contain nginx shouldn't show the root either.
  if (!nginx) return items;
  const icons = (nginx?.icons ?? []).map((icon) => ({
    ...icon,
    src: '',
  })) as RegistrySearchResult['icons'];
  return [...items, { ...NGINX_GROUP_FIXTURE, icons }];
};
