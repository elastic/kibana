/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';

export const GRAPH_TAGS = [...tags.stateful.classic];

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;

/**
 * Shape of the relevant slice of `POST /api/core/capabilities` for the Graph
 * feature. Shared by every `capabilities_*` spec — keep additional fields
 * narrow so the type stays a useful contract instead of `any`.
 */
export interface CapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  graph: { show: boolean; save: boolean; delete: boolean };
}

export const SECREPO_ES_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/graph/secrepo';

export const SECREPO_INDEX = 'secrepo';
export const SECREPO_TIME_FIELD = '@timestamp';

export const GRAPH_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { graph: ['all'] },
      spaces: ['*'],
    },
  ],
};

export const GRAPH_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { graph: ['read'] },
      spaces: ['*'],
    },
  ],
};

// FTR parity: the no-graph role used the dashboard feature to ensure the user
// has *some* Kibana access, so failures cannot be attributed to "no UI at all".
export const NO_GRAPH_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [
    {
      base: [],
      feature: { dashboard: ['all'] },
      spaces: ['*'],
    },
  ],
};

// The role used by graph_explore.spec.ts to drive the actual /internal/graph/graphExplore
// endpoint. Needs ES read on the secrepo index plus Kibana graph feature access.
export const GRAPH_EXPLORE_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [SECREPO_INDEX], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { graph: ['all'] },
      spaces: ['*'],
    },
  ],
};

// The same query the Graph UI sends when "Add fields" selects
// url.parts/url/params/src and the user queries for "admin".
export const SECREPO_GRAPH_EXPLORE_QUERY = {
  query: { query_string: { query: 'admin' } },
  controls: {
    use_significance: true,
    sample_size: 2000,
    timeout: 5000,
  },
  connections: {
    vertices: [
      { field: 'url.parts', size: 5, min_doc_count: 3 },
      { field: 'url', size: 5, min_doc_count: 3 },
      { field: 'params', size: 5, min_doc_count: 3 },
      { field: 'src', size: 5, min_doc_count: 3 },
    ],
  },
  vertices: [
    { field: 'url.parts', size: 5, min_doc_count: 3 },
    { field: 'url', size: 5, min_doc_count: 3 },
    { field: 'params', size: 5, min_doc_count: 3 },
    { field: 'src', size: 5, min_doc_count: 3 },
  ],
} as const;

// The expected vertex labels returned by graphExplore against the secrepo
// archive — preserved verbatim from the FTR test (graph.ts) to keep parity.
export const EXPECTED_NODES = [
  'blog',
  '/wordpress/wp-admin/',
  '202.136.75.194',
  '190.154.27.54',
  '187.131.21.37',
  'wp',
  '80.5.27.16',
  'login.php',
  '181.113.155.46',
  'admin',
  'wordpress',
  '/test/wp-admin/',
  'test',
  '/wp-login.php',
  '/blog/wp-admin/',
] as const;

// Source-label -> set of target labels; preserved verbatim from the FTR test
// (graph.ts). Used as an undirected adjacency map for connection assertions.
export const EXPECTED_CONNECTIONS: Record<string, Record<string, true>> = {
  '/blog/wp-admin/': { wp: true, blog: true },
  wp: {
    blog: true,
    '202.136.75.194': true,
    'login.php': true,
    admin: true,
    '/test/wp-admin/': true,
    '/wp-login.php': true,
    '80.5.27.16': true,
    '/wordpress/wp-admin/': true,
    '190.154.27.54': true,
    '187.131.21.37': true,
    '181.113.155.46': true,
  },
  admin: { test: true, blog: true, '/blog/wp-admin/': true },
  '/test/wp-admin/': { admin: true },
  test: { wp: true, '/test/wp-admin/': true },
  wordpress: { wp: true, admin: true },
  '/wordpress/wp-admin/': { wordpress: true, admin: true },
};
