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
        // @Tina: DETERMINE IF READY FOR UPGRADE
        // minor and patch upgrades only blocked on health issues (status !== green)
        const upgradeTypeBasedReadyForUpgrade = (ut: ReleaseType) => {
          if (ut === 'major') {
            return (
              totalCriticalHealthIssues === 0 && // should be none if ready for upgrade
              totalCriticalDeprecations === 0 && // es critical deprecations
              kibanaTotalCriticalDeps === 0 && // kbn critical deprecations
              systemIndicesMigrationStatus === 'NO_MIGRATION_NEEDED'
            );
          }

          return totalCriticalHealthIssues === 0;
        };

        const readyForUpgrade = upgradeTypeBasedReadyForUpgrade(upgradeType!);

        const getStatusMessage = () => {
          if (readyForUpgrade) {
            return i18n.translate('xpack.upgradeAssistant.status.allDeprecationsResolvedMessage', {
              defaultMessage: 'All deprecation warnings have been resolved.',
            });
          }

          const upgradeIssues: string[] = [];
          const esTotalCriticalDeps = totalCriticalDeprecations + totalCriticalHealthIssues;

          if (notMigratedSystemIndices) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.systemIndicesMessage', {
                defaultMessage:
                  '{notMigratedSystemIndices} unmigrated system {notMigratedSystemIndices, plural, one {index} othezr {indices}}',
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
