/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// `read_view_metadata` keeps ES|QL Views in the Data management panel, so the hidden-link tests have a visible anchor.
const INDICES_READ = [
  { names: ['*'], privileges: ['read', 'view_index_metadata', 'read_view_metadata'] },
];

const roleWithClusterPrivileges = (cluster: string[]): KibanaRole => ({
  elasticsearch: { cluster, indices: INDICES_READ },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
});

export const SEARCH_BOOST_READ_ROLE = roleWithClusterPrivileges([
  'read_boost_profiles',
  'read_boost_rules',
]);

// `monitor` makes Index Management available, so match names link to it.
export const SEARCH_BOOST_READ_WITH_INDEX_MANAGEMENT_ROLE = roleWithClusterPrivileges([
  'read_boost_profiles',
  'read_boost_rules',
  'monitor',
]);

// `delete_index` adds "Delete data stream" to Index Management's flyout, only for the test's data stream.
export const SEARCH_BOOST_READ_DELETE_DATA_STREAMS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['read_boost_profiles', 'read_boost_rules', 'monitor'],
    indices: [...INDICES_READ, { names: ['*-stream-deletable'], privileges: ['delete_index'] }],
  },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

export const SEARCH_BOOST_MANAGE_ROLE = roleWithClusterPrivileges([
  'read_boost_profiles',
  'read_boost_rules',
  'manage_boost_profiles',
  'manage_boost_rules',
]);

export const ONLY_MANAGE_BOOST_PROFILES_ROLE = roleWithClusterPrivileges([
  'read_boost_profiles',
  'read_boost_rules',
  'manage_boost_profiles',
]);

export const ONLY_MANAGE_BOOST_RULES_ROLE = roleWithClusterPrivileges([
  'read_boost_profiles',
  'read_boost_rules',
  'manage_boost_rules',
]);

export const SEARCH_BOOST_READ_WITHOUT_INDICES_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['read_boost_profiles', 'read_boost_rules'], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

export const ONLY_READ_BOOST_PROFILES_ROLE = roleWithClusterPrivileges(['read_boost_profiles']);
export const ONLY_READ_BOOST_RULES_ROLE = roleWithClusterPrivileges(['read_boost_rules']);
