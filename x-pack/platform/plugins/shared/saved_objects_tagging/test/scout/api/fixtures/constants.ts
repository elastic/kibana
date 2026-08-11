/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const TAGS_API_VERSION = '2023-10-31';

export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': TAGS_API_VERSION,
  'Content-Type': 'application/json;charset=UTF-8',
};

export const NO_KIBANA_ACCESS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [],
};

export const SO_MANAGEMENT_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], spaces: ['*'], feature: { savedObjectsManagement: ['all'] } }],
};

export const DASHBOARD_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], spaces: ['default'], feature: { dashboard: ['all'] } }],
};

export const VISUALIZE_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], spaces: ['default'], feature: { visualize: ['all'] } }],
};

export const SO_TAGGING_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], spaces: ['default'], feature: { savedObjectsTagging: ['read'] } }],
};

export const SO_TAGGING_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], spaces: ['default'], feature: { savedObjectsTagging: ['all'] } }],
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

export const TELEMETRY_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': '2',
};

export const KBN_ARCHIVES = {
  FUNCTIONAL_BASE:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json',
  BULK_ASSIGN:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/bulk_assign/data.json',
  DELETE_WITH_REFERENCES:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/delete_with_references/data.json',
  USAGE_COLLECTION:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/usage_collection/data.json',
  RBAC_TAGS_DEFAULT_SPACE:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/rbac_tags/default_space.json',
  RBAC_TAGS_SPACE_1:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/rbac_tags/space_1.json',
} as const;
