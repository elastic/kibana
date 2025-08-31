/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { versionCheckHandlerWrapper } from '@kbn/upgrade-assistant-pkg-server';
import { API_BASE_PATH } from '../../common/constants';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import type { RouteDependencies } from '../types';

export function registerESDeprecationRoutes({
  config: { featureSet, dataSourceExclusions },
  router,
  lib: { handleEsError },
  log,
  current,
  cleanupReindexOperations,
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/es_deprecations`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(current.major)(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;
        const status = await getESUpgradeStatus(client.asCurrentUser, {
          featureSet,
          dataSourceExclusions,
        });

        const indexNames = [...status.migrationsDeprecations, ...status.enrichedHealthIndicators]
          .filter(({ index }) => typeof index !== 'undefined')
          .map(({ index }) => index as string);

        await cleanupReindexOperations(indexNames);

        return response.ok({
          body: {
            totalCriticalDeprecations: 3,
            migrationsDeprecations: [
              {
                index: 'kibana_sample_data_ecommerce',
                type: 'index_settings',
                details: 'This index has version: 7.17.28',
                message: 'Old index with a compatibility version < 8.0',
                url: 'https://ela.st/es-deprecation-9-index-version',
                level: 'critical',
                resolveDuringUpgrade: false,
                correctiveAction: {
                  type: 'reindex',
                  metadata: {
                    isClosedIndex: false,
                    isFrozenIndex: false,
                    isInDataStream: false,
                  },
                  excludedActions: ['readOnly'],
                  indexSizeInBytes: 4550530,
                },
              },
              {
                index: 'kibana_sample_data_logs',
                type: 'data_streams',
                details:
                  'This data stream has backing indices that were created before Elasticsearch 8.0',
                message: 'Old data stream with a compatibility version < 8.0',
                url: 'https://ela.st/es-deprecation-ds-reindex',
                level: 'critical',
                resolveDuringUpgrade: false,
                correctiveAction: {
                  type: 'dataStream',
                  metadata: {
                    ignoredIndicesRequiringUpgrade: [],
                    ignoredIndicesRequiringUpgradeCount: 0,
                    totalBackingIndices: 1,
                    indicesRequiringUpgradeCount: 1,
                    indicesRequiringUpgrade: ['.ds-kibana_sample_data_logs-2025.08.31-000001'],
                    reindexRequired: true,
                    excludedActions: [],
                  },
                },
              },
              {
                index: 'kibana_sample_data_flights',
                type: 'index_settings',
                details: 'This index has version: 7.17.28',
                message: 'Old index with a compatibility version < 8.0',
                url: 'https://ela.st/es-deprecation-9-index-version',
                level: 'critical',
                resolveDuringUpgrade: false,
                correctiveAction: {
                  type: 'reindex',
                  metadata: {
                    isClosedIndex: false,
                    isFrozenIndex: false,
                    isInDataStream: false,
                  },
                  excludedActions: ['readOnly'],
                  indexSizeInBytes: 6391375,
                },
              },
            ],
            totalCriticalHealthIssues: 0,
            enrichedHealthIndicators: [],
          },
        });
      } catch (error) {
        log.error(error);
        return handleEsError({ error, response });
      }
    })
  );
}
