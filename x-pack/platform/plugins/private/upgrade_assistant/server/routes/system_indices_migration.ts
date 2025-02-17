/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';
import { startESSystemIndicesMigration } from '../lib/es_system_indices_migration';

export function registerSystemIndicesMigrationRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  // GET status of the system indices migration
  router.get(
    {
      path: `${API_BASE_PATH}/system_indices_migration`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;
        // const status = await getESSystemIndicesMigrationStatus(client.asCurrentUser);

        return response.ok({
          body: {
            features: [
              {
                feature_name: 'kibana',
                minimum_index_version: '6.8.20',
                migration_status: 'ERROR',
                indices: [
                  {
                    index: '.apm-agent-configuration',
                    version: '7.16.0',
                  },
                  {
                    index: '.apm-custom-link',
                    version: '7.16.0',
                  },
                  {
                    index: '.kibana_1',
                    version: '6.8.20',
                    failure_cause: {
                      error: {
                        root_cause: [
                          {
                            type: 'resource_already_exists_exception',
                            reason: 'error occurred while reindexing, bulk failures ',
                            stack_trace: 'ElasticsearchException[error occurred whi',
                          },
                        ],
                        type: 'resource_already_exists_exception',
                        reason: 'error occurred while reindexing, bulk failures [{"in',
                        stack_trace: 'ElasticsearchException[error occurred while rei',
                      },
                    },
                  },
                  {
                    index: '.kibana_1-reindexed-for-8',
                    version: '7.16.0',
                    failure_cause: {
                      error: {
                        root_cause: [
                          {
                            type: 'unknown_exception',
                            reason: 'error occurred while reindexing, bulk failu',
                            stack_trace: 'ElasticsearchException[error occurred',
                          },
                        ],
                        type: 'unknown_exception',
                        reason: 'error occurred while reindexing, bulk failures [{',
                        stack_trace: 'ElasticsearchException[error occurred while',
                      },
                    },
                  },
                  {
                    index: '.kibana_7.16.0_001',
                    version: '7.16.0',
                  },
                  {
                    index: '.kibana_security_session_1',
                    version: '7.16.0',
                  },
                  {
                    index: '.kibana_task_manager_7.16.0_001',
                    version: '7.16.0',
                  },
                  {
                    index: '.kibana_task_manager_pre7.4.0_001',
                    version: '7.16.0',
                  },
                ],
              },
              {
                feature_name: 'security',
                minimum_index_version: '6.8.20',
                migration_status: 'ERROR',
                indices: [
                  {
                    index: '.security-6',
                    version: '6.8.20',
                    failure_cause: {
                      error: {
                        root_cause: [
                          {
                            type: 'unknown_exception',
                            reason: 'error occurred while reindexing, bulk failures ',
                            stack_trace: 'ElasticsearchException[error occurred whi',
                          },
                        ],
                        type: 'unknown_exception',
                        reason: 'error occurred while reindexing, bulk failures [{"in',
                        stack_trace: 'ElasticsearchException[error occurred while re',
                      },
                    },
                  },
                ],
              },
            ],
            migration_status: 'ERROR',
          },
        });

        return response.ok({
          body: {
            ...status,
            features: status.features.filter(
              (feature) => feature.migration_status !== 'NO_MIGRATION_NEEDED'
            ),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );

  // POST starts the system indices migration
  router.post(
    {
      path: `${API_BASE_PATH}/system_indices_migration`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;
        const status = await startESSystemIndicesMigration(client.asCurrentUser);

        return response.ok({
          body: status,
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
