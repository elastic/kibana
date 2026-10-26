/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import pMap from 'p-map';
import type { Space } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';
import { MIGRATE_LOG_VIEW_SETTINGS_URL } from '../../common/http_api/deprecations';
import { CONCURRENT_SPACES_TO_CHECK } from './constants';
import { defaultLogViewId } from '../../common/log_views';
import { logSourcesKibanaAdvancedSettingRT } from '../../common';
import type { LogsSharedPluginStartServicesAccessor } from '../types';

export interface LogSourcesSettingDeprecationParams {
  context: GetDeprecationsContext;
  getStartServices: LogsSharedPluginStartServicesAccessor;
}

export const getLogSourcesSettingDeprecationInfo = async (
  params: LogSourcesSettingDeprecationParams
): Promise<DeprecationsDetails[]> => {
  const [_, pluginStartDeps] = await params.getStartServices();

  const allAvailableSpaces = await pluginStartDeps.spaces.spacesService
    .createSpacesClient(params.context.request)
    .getAll({ purpose: 'any' });

  const deprecationPerSpaceFactory = getLogSourcesSettingDeprecationInfoForSpaceFactory(params);

  const results = await pMap(allAvailableSpaces, deprecationPerSpaceFactory, {
    concurrency: CONCURRENT_SPACES_TO_CHECK, // limit the number of spaces handled concurrently to make sure that we cover large deployments
  });

  const offendingSpaces = results.filter(Boolean) as string[];

  if (offendingSpaces.length) {
    const shortList =
      offendingSpaces.length < 4
        ? offendingSpaces.join(', ')
        : `${offendingSpaces.slice(0, 3).join(', ')}, ...`;
    const fullList = offendingSpaces.join(', ');
    return [
      {
        title: i18n.translate(
          'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.title',
          {
            defaultMessage: 'Log sources setting in {count} spaces: {shortList}',
            values: { count: offendingSpaces.length, shortList },
          }
        ),
        level: 'warning',
        deprecationType: 'feature',
        message: i18n.translate(
          'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.message',
          {
            defaultMessage:
              'Indices and Data view options previously provided via the Logs UI settings page are now deprecated. Please migrate to using the Kibana log sources advanced setting in each of the following spaces: {fullList}.',
            values: { fullList },
          }
        ),
        correctiveActions: {
          manualSteps: offendingSpaces.map((spaceName) =>
            i18n.translate(
              'xpack.logsShared.deprecations.migrateLogViewSettingsToLogSourcesSetting.message.manualStepMessage',
              {
                defaultMessage:
                  'While in the space "{spaceName}" update the Log sources Kibana advanced setting (via Management > Advanced Settings) to match the setting previously provided via the Logs UI settings page. Then via the Logs UI settings page use the Kibana log sources advanced setting option.',
                values: { spaceName },
              }
            )
          ),
          api: {
            method: 'PUT',
            path: MIGRATE_LOG_VIEW_SETTINGS_URL,
          },
        },
      },
    ];
  } else {
    return [];
  }
};

export const getLogSourcesSettingDeprecationInfoForSpaceFactory = ({
  getStartServices,
  context,
}: LogSourcesSettingDeprecationParams): ((space: Space) => Promise<string | undefined>) => {
  return async (space) => {
    const [_, pluginStartDeps, pluginStart] = await getStartServices();

    // Get a new Saved Object Client scoped to the space.id
    const spaceScopedSavedObjectsClient = context.savedObjectsClient.asScopedToNamespace(space.id);

    const logSourcesService =
      pluginStartDeps.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
        spaceScopedSavedObjectsClient
      );
    const logViewsClient = pluginStart.logViews.getClient(
      spaceScopedSavedObjectsClient,
      context.esClient.asCurrentUser,
      logSourcesService
    );

    const logView = await logViewsClient.getLogView(defaultLogViewId);

    if (logView && !logSourcesKibanaAdvancedSettingRT.is(logView.attributes.logIndices)) {
      return space.name;
    }
  };
};
