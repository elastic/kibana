/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { KibanaRole } from '@kbn/scout/src/common/services/custom_role';

export enum USER {
  TRANSFORM_POWERUSER = 'transform_poweruser',
  TRANSFORM_VIEWER = 'transform_viewer',
  TRANSFORM_UNAUTHORIZED = 'transform_unauthorized',
}

const ROLES = [
  {
    name: 'transform_source',
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
    },
  },
  {
    name: 'transform_dest',
    elasticsearch: {
      indices: [{ names: ['user-*'], privileges: ['read', 'index', 'manage', 'delete'] }],
    },
  },
  {
    name: 'transform_dest_readonly',
    elasticsearch: {
      indices: [{ names: ['user-*'], privileges: ['read'] }],
    },
  },
  {
    name: 'transform_ui_extras',
    elasticsearch: {
      cluster: ['monitor', 'read_pipeline'],
    },
  },
];

const USERS = [
  {
    name: 'transform_poweruser',
    full_name: 'Transform Poweruser',
    password: 'tfp001',
    roles: [
      'kibana_admin',
      'transform_admin',
      'transform_source',
      'transform_dest',
      'transform_ui_extras',
    ],
  },
  {
    name: 'transform_viewer',
    full_name: 'Transform Viewer',
    password: 'tfv001',
    roles: ['kibana_admin', 'transform_user', 'transform_dest_readonly'],
  },
  {
    name: 'transform_unauthorized',
    full_name: 'Transform Unauthorized',
    password: 'tfu001',
    roles: ['kibana_admin'],
  },
];

export async function createTransformRoles(kbnClient: KbnClient) {
  for (const role of ROLES) {
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${role.name}`,
      body: {
        elasticsearch: role.elasticsearch,
      },
    });
  }
}

export function getTransformPoweruserRoleDescriptor(): KibanaRole {
  return {
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['monitor_transform', 'manage_transform', 'monitor', 'read_pipeline'],
      indices: [
        { names: ['*'], privileges: ['read', 'view_index_metadata'] },
        { names: ['user-*'], privileges: ['read', 'index', 'manage', 'delete'] },
      ],
    },
  };
}

export function getTransformViewerRoleDescriptor(): KibanaRole {
  return {
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['monitor_transform'],
      indices: [{ names: ['user-*'], privileges: ['read'] }],
    },
  };
}

export function getTransformUnauthorizedRoleDescriptor(): KibanaRole {
  return {
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: [],
      indices: [],
    },
  };
}

export async function createTransformUsers(kbnClient: KbnClient) {
  for (const user of USERS) {
    await kbnClient.request({
      method: 'POST',
      path: `/internal/security/users/${user.name}`,
      body: {
        username: user.name,
        password: user.password,
        roles: user.roles,
        full_name: user.full_name,
      },
    });
  }
}

export async function cleanTransformRoles(kbnClient: KbnClient) {
  for (const role of ROLES) {
    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/security/role/${role.name}`,
      });
    } catch (e) {
      // Ignore errors if role doesn't exist
    }
  }
}

export async function cleanTransformUsers(kbnClient: KbnClient) {
  for (const user of USERS) {
    try {
      await kbnClient.request({
        method: 'DELETE',
        path: `/internal/security/users/${user.name}`,
      });
    } catch (e) {
      // Ignore errors if user doesn't exist
    }
  }
}
