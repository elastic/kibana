/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallWithRequest } from '../types';

export const readPrivileges = async (
  callWithRequest: CallWithRequest<unknown, unknown, unknown>,
  index: string
): Promise<unknown> => {
  return callWithRequest('transport.request', {
    path: `_security/user/_has_privileges`,
    method: 'POST',
    body: {
      cluster: [
        'all',
        'create_snapshot',
        'manage',
        'manage_api_key',
        'manage_ccr',
        'manage_transform',
        'manage_ilm',
        'manage_index_templates',
        'manage_ingest_pipelines',
        'manage_ml',
        'manage_own_api_key',
        'manage_pipeline',
        'manage_rollup',
        'manage_saml',
        'manage_security',
        'manage_token',
        'manage_watcher',
        'monitor',
        'monitor_transform',
        'monitor_ml',
        'monitor_rollup',
        'monitor_watcher',
        'read_ccr',
        'read_ilm',
        'transport_client',
      ],
      index: [
        {
          names: [index],
          privileges: [
            'all',
            'create',
            'create_doc',
            'create_index',
            'delete',
            'delete_index',
            'index',
            'manage',
            'manage_follow_index',
            'manage_ilm',
            'manage_leader_index',
            'monitor',
            'read',
            'read_cross_cluster',
            'view_index_metadata',
            'write',
          ],
        },
      ],
    },
  });
};
