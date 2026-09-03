/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchFeatureConfig } from '@kbn/features-plugin/server';

const userManagementFeature: ElasticsearchFeatureConfig = {
  id: 'users',
  management: {
    security: ['users'],
  },
  catalogue: ['security'],
  privileges: [
    {
      requiredClusterPrivileges: ['manage_security'],
      ui: ['save'],
    },
    {
      requiredClusterPrivileges: ['read_security'],
      ui: [],
    },
  ],
};

const rolesManagementFeature: ElasticsearchFeatureConfig = {
  id: 'roles',
  management: {
    security: ['roles'],
  },
  catalogue: ['security'],
  privileges: [
    {
      requiredClusterPrivileges: ['manage_security'],
      ui: ['save', 'view'],
    },
    {
      requiredClusterPrivileges: ['read_security'],
      ui: ['view'],
    },
  ],
};

const apiKeysManagementFeature: ElasticsearchFeatureConfig = {
  id: 'api_keys',
  management: {
    security: ['api_keys'],
  },
  catalogue: ['security'],
  privileges: [
    {
      requiredClusterPrivileges: ['manage_api_key'],
      ui: ['save'],
    },
    {
      requiredClusterPrivileges: ['manage_own_api_key'],
      ui: ['save'],
    },
    {
      requiredClusterPrivileges: ['read_security'],
      ui: [],
    },
  ],
};

const roleMappingsManagementFeature: ElasticsearchFeatureConfig = {
  id: 'role_mappings',
  management: {
    security: ['role_mappings'],
  },
  catalogue: ['security'],
  privileges: [
    {
      requiredClusterPrivileges: ['manage_security'],
      ui: ['save'],
    },
    {
      requiredClusterPrivileges: ['read_security'],
      ui: [],
    },
  ],
};

const applicationConnectionsManagementFeature: ElasticsearchFeatureConfig = {
  id: 'application_connections',
  management: {
    security: ['application_connections'],
  },
  catalogue: ['security'],
  privileges: [
    {
      requiredClusterPrivileges: ['manage_security'],
      ui: ['save'],
    },
    {
      requiredClusterPrivileges: ['read_security'],
      ui: [],
    },
  ],
};

// The management entry is inert until a management app with this id is registered
// (https://github.com/elastic/kibana/issues/284466); without it, that app would start out disabled.
const serviceAccountsManagementFeature: ElasticsearchFeatureConfig = {
  id: 'service_accounts',
  management: {
    security: ['service_accounts'],
  },
  catalogue: ['security'],
  privileges: [
    {
      requiredClusterPrivileges: ['manage_security'],
      ui: ['save'],
    },
    {
      requiredClusterPrivileges: ['read_security'],
      ui: [],
    },
  ],
};

export const securityFeatures = [
  userManagementFeature,
  rolesManagementFeature,
  apiKeysManagementFeature,
  roleMappingsManagementFeature,
  applicationConnectionsManagementFeature,
  serviceAccountsManagementFeature,
];
