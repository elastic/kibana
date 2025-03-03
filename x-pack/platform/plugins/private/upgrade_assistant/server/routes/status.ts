/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { getKibanaUpgradeStatus } from '../lib/kibana_status';
import { getESSystemIndicesMigrationStatus } from '../lib/es_system_indices_migration';
import { RouteDependencies } from '../types';
import { getUpgradeType } from '../lib/upgrade_type';

/**
 * Note that this route is primarily intended for consumption by Cloud.
 */
export function registerUpgradeStatusRoute({
  config: { featureSet },
  router,
  lib: { handleEsError },
  current,
  defaultTarget,
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/status`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Get upgrade readiness status`,
      },
      validate: {
        query: schema.object({
          targetVersion: schema.maybe(schema.string()),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const targetVersion = request.query?.targetVersion || `${defaultTarget}`;
      const upgradeType = getUpgradeType({ current, target: targetVersion });
      if (!upgradeType) return response.forbidden();

      try {
        const {
          elasticsearch: { client: esClient },
          deprecations: { client: deprecationsClient },
        } = await core;
        // Fetch ES upgrade status
        const {
          totalCriticalDeprecations, // critical deprecations
          totalCriticalHealthIssues, // critical health issues
        } = await getESUpgradeStatus(esClient, featureSet);

        const getSystemIndicesMigrationStatus = async () => {
          /**
           * Skip system indices migration status check if `featureSet.migrateSystemIndices`
           * is set to `false`. This flag is enabled from configs for major version stack ugprades.
           * returns `migration_status: 'NO_MIGRATION_NEEDED'` to indicate no migration needed.
           */
          if (!featureSet.migrateSystemIndices) {
            return {
              migration_status: 'NO_MIGRATION_NEEDED',
              features: [],
            };
          }

          // Fetch system indices migration status from ES
          return await getESSystemIndicesMigrationStatus(esClient.asCurrentUser);
        };

        const { migration_status: systemIndicesMigrationStatus, features } =
          await getSystemIndicesMigrationStatus();

        const notMigratedSystemIndices = features.filter(
          (feature) => feature.migration_status !== 'NO_MIGRATION_NEEDED'
        ).length;

        // Fetch Kibana upgrade status
        const { totalCriticalDeprecations: kibanaTotalCriticalDeps } = await getKibanaUpgradeStatus(
          deprecationsClient
        );
        // non-major upgrades blocked only for health issues (status !== green)
        let upgradeTypeBasedReadyForUpgrade: boolean;
        if (upgradeType === 'major') {
          upgradeTypeBasedReadyForUpgrade =
            totalCriticalHealthIssues === 0 &&
            totalCriticalDeprecations === 0 &&
            kibanaTotalCriticalDeps === 0 &&
            systemIndicesMigrationStatus === 'NO_MIGRATION_NEEDED';
        } else {
          upgradeTypeBasedReadyForUpgrade = totalCriticalHealthIssues === 0;
        }

        const readyForUpgrade = upgradeType && upgradeTypeBasedReadyForUpgrade;

        const getStatusMessage = () => {
          if (readyForUpgrade) {
            return i18n.translate('xpack.upgradeAssistant.status.allDeprecationsResolvedMessage', {
              defaultMessage: 'All deprecation warnings have been resolved.',
            });
          }

          const upgradeIssues: string[] = [];
          let esTotalCriticalDeps = totalCriticalHealthIssues;
          if (upgradeType === 'major') {
            esTotalCriticalDeps += totalCriticalDeprecations;
          }

          if (upgradeType === 'major' && notMigratedSystemIndices) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.systemIndicesMessage', {
                defaultMessage:
                  '{notMigratedSystemIndices} unmigrated system {notMigratedSystemIndices, plural, one {index} other {indices}}',
                values: { notMigratedSystemIndices },
              })
            );
          }
          // can be improved by showing health indicator issues separately
          if (esTotalCriticalDeps) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.esTotalCriticalDepsMessage', {
                defaultMessage:
                  '{esTotalCriticalDeps} Elasticsearch deprecation {esTotalCriticalDeps, plural, one {issue} other {issues}}',
                values: { esTotalCriticalDeps },
              })
            );
          }

          if (upgradeType === 'major' && kibanaTotalCriticalDeps) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.kibanaTotalCriticalDepsMessage', {
                defaultMessage:
                  '{kibanaTotalCriticalDeps} Kibana deprecation {kibanaTotalCriticalDeps, plural, one {issue} other {issues}}',
                values: { kibanaTotalCriticalDeps },
              })
            );
          }
          return i18n.translate('xpack.upgradeAssistant.status.deprecationsUnresolvedMessage', {
            defaultMessage:
              'The following issues must be resolved before upgrading: {upgradeIssues}.',
            values: {
              upgradeIssues: upgradeIssues.join(', '),
            },
          });
        };

        return response.ok({
          body: {
            readyForUpgrade,
            details: getStatusMessage(),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
