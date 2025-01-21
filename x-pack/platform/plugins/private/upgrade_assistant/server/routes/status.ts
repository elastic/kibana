/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ReleaseType } from 'semver';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { getKibanaUpgradeStatus } from '../lib/kibana_status';

import { getESSystemIndicesMigrationStatus } from '../lib/es_system_indices_migration';
import { RouteDependencies } from '../types';
import { getUpgradeType } from '../lib/upgrade_type';

// export const getUpgradeType = ({ current, target }: UpgradeTypeParams) =>
//   // if we don't know the target, we default to 9.0.0
//   semver.diff(current, target);

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
      // validate: false,
      validate: {
        query: schema.object({
          targetVersion: schema.maybe(schema.string()),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const targetVersion = request.query?.targetVersion || `${defaultTarget}`;
      const upgradeType = getUpgradeType({
        current,
        target: targetVersion,
      });

      try {
        const {
          elasticsearch: { client: esClient },
          deprecations: { client: deprecationsClient },
        } = await core;
        // Fetch ES upgrade status
        const { totalCriticalDeprecations: esTotalCriticalDeps, totalNotHealthy } =
          await getESUpgradeStatus(esClient, featureSet); // returns {totalCriticalDeprecations, deprecations}
        // where deprecations = [ ...enrichedHealthIndicators, ...toggleMigrationsDeprecations ]
        // we want to split out the health indicators.

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
        // @Tina todo: DETERMINE IF READY FOR UPGRADE
        // should depend on the upgradeType:
        // isMajor || isMinor || isPatch || !null -> any notHealthy blocks (readyForUpgrade false)
        // isMajor -> any critical deprecations (es || kibana) block (readyForUpgrade is false)
        // isMinor => critical deprecations (es && kibana) don't block (readyForUpgrade[deprecations] true)
        const upgradeTypeBasedReadyForUpgrade = (ut: ReleaseType) => {
          if (ut === 'major') {
            return (
              totalNotHealthy === 0 && // should be none if ready for upgrade
              esTotalCriticalDeps === 0 &&
              kibanaTotalCriticalDeps === 0 &&
              systemIndicesMigrationStatus === 'NO_MIGRATION_NEEDED'
            );
          }
          // minor and patch upgrades we don't block when there are critical deprecations. those only come into effect for major upgrades.
          return (
            totalNotHealthy === 0 && // should be none if ready for upgrade
            systemIndicesMigrationStatus === 'NO_MIGRATION_NEEDED'
          );
        };

        const readyForUpgrade = upgradeTypeBasedReadyForUpgrade(upgradeType!);

        const getStatusMessage = () => {
          if (readyForUpgrade) {
            return i18n.translate('xpack.upgradeAssistant.status.allDeprecationsResolvedMessage', {
              defaultMessage: 'All deprecation warnings have been resolved.',
            });
          }

          const upgradeIssues: string[] = [];
          // @TINA Added entry for health-related issues
          if (totalNotHealthy !== 0) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.systemHealthMessage', {
                defaultMessage:
                  '{totalNotHealthy} cluster health {totalNotHealthy, plural, one {issue} other {issues}}',
                values: { totalNotHealthy },
              })
            );
          }
          if (notMigratedSystemIndices) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.systemIndicesMessage', {
                defaultMessage:
                  '{notMigratedSystemIndices} unmigrated system {notMigratedSystemIndices, plural, one {index} other {indices}}',
                values: { notMigratedSystemIndices },
              })
            );
          }

          if (esTotalCriticalDeps) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.esTotalCriticalDepsMessage', {
                defaultMessage:
                  '{esTotalCriticalDeps} Elasticsearch deprecation {esTotalCriticalDeps, plural, one {issue} other {issues}}',
                values: { esTotalCriticalDeps },
              })
            );
          }

          if (kibanaTotalCriticalDeps) {
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
