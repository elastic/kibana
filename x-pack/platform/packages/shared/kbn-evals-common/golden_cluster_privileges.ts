/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared privilege descriptors for the golden cluster API key.
 *
 * Used by the CLI (`node scripts/evals init`) and the evals plugin
 * (remote Kibana configuration UI). Consumers override `name` and
 * `metadata` to suit their context.
 */
export const goldenClusterPrivileges = {
  kibana_role_descriptors: {
    'kbn-evals-all': {
      elasticsearch: {
        cluster: ['manage_index_templates'],
        indices: [
          {
            names: ['kibana-evaluations*'],
            privileges: [
              'auto_configure',
              'create_index',
              'create_doc',
              'read',
              'view_index_metadata',
            ],
          },
          {
            names: ['traces-*'],
            privileges: [
              'auto_configure',
              'create_index',
              'create_doc',
              'read',
              'view_index_metadata',
            ],
          },
          {
            names: ['kibana-evaluation-dataset*'],
            privileges: [
              'auto_configure',
              'create_index',
              'create_doc',
              'read',
              'view_index_metadata',
              'delete',
              'index',
            ],
          },
        ],
      },
      kibana: [{ base: [], spaces: ['*'], feature: { evals: ['all'] } }],
    },
  },
} as const;
