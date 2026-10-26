/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { ElasticsearchRoleDescriptor, RoleApiCredentials } from '@kbn/scout';

// Mirrors `API_BASE_PATH` in the plugin's `common/constants`; the Scout tests are a separate TS
// project, so the value is restated rather than imported across that boundary.
export const API_BASE_PATH = '/api/index_lifecycle_management';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

export const getHeaders = ({ apiKeyHeader }: RoleApiCredentials) => ({
  ...COMMON_HEADERS,
  ...apiKeyHeader,
});

// ILM/SLM policies, templates, repositories and indices are cluster-global and the cluster may be
// shared, so every resource the suite creates carries this prefix (plus a per-run id).
export const TEST_RESOURCE_PREFIX = 'ilm-api';

/** Run-unique resource name under the suite prefix, e.g. `ilm-api-1a2b3c4d-policy`. */
export const getResourceName = (suffix: string) =>
  `${TEST_RESOURCE_PREFIX}-${randomUUID().slice(0, 8)}-${suffix}`;

// Set by `node.attr.name=apiIntegrationTestNode` in the Scout stateful base config.
export const NODE_CUSTOM_ATTRIBUTE = 'name:apiIntegrationTestNode';

// Managed repository that always exists on Elastic Cloud.
export const CLOUD_REPOSITORY_NAME = 'found-snapshots';

// Dates that never exist (30 Feb), so SLM never fires the policy mid-run.
export const NEVER_FIRING_SCHEDULE = '0 0 0 30 2 ?';

/**
 * Least-privilege role for the ILM APIs: the routes disable Kibana authorization and act as the
 * current user via the ES client, so only ES privileges are needed. Index privileges are scoped to
 * the suite's own resources.
 *
 * Plain ES descriptors on purpose: a `KibanaRole` with `kibana: []` yields an API key with empty
 * `role_descriptors`, which inherits every privilege of the (admin) key owner.
 */
export const ILM_API_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['manage_ilm', 'manage_index_templates', 'monitor', 'monitor_snapshot', 'read_slm'],
  indices: [
    {
      names: [`${TEST_RESOURCE_PREFIX}-*`, `.${TEST_RESOURCE_PREFIX}-*`],
      privileges: ['manage', 'manage_ilm', 'view_index_metadata'],
    },
  ],
};

// Can read ILM policies but not change them; proves `manage_ilm` is required to create one.
export const ILM_READ_ONLY_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['read_ilm'],
};
