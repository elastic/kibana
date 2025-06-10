/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataViewsContract, type DataView } from '@kbn/data-views-plugin/common';
import { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';

export type LogsSourceConfiguration =
  | SharedSettingLogsSourceConfiguration
  | IndexNameLogsSourceConfiguration
  | DataViewLogsSourceConfiguration;

export interface SharedSettingLogsSourceConfiguration {
  type: 'shared_setting';
  timestampField?: string;
  messageField?: string;
}

export interface IndexNameLogsSourceConfiguration {
  type: 'index_name';
  indexName: string;
  timestampField: string;
  messageField: string;
}

export interface DataViewLogsSourceConfiguration {
  type: 'data_view';
  dataView: DataView;
  messageField?: string;
}

export type ResolvedIndexNameLogsSourceConfiguration = IndexNameLogsSourceConfiguration & {
  dataView: DataView;
};

export const normalizeLogsSource =
  ({
    logsDataAccess,
    dataViewsService,
  }: {
    logsDataAccess: LogsDataAccessPluginStart;
    dataViewsService: DataViewsContract;
  }) =>
  async (
    logsSource: LogsSourceConfiguration
  ): Promise<ResolvedIndexNameLogsSourceConfiguration> => {
    switch (logsSource.type) {
      case 'index_name':
        return {
          ...logsSource,
          dataView: await getDataViewForLogSource(logsSource, dataViewsService),
        };
      case 'shared_setting':
        const logSourcesFromSharedSettings =
          await logsDataAccess.services.logSourcesService.getLogSources();
        const sharedSettingLogsSource = {
          type: 'index_name' as const,
          indexName: logSourcesFromSharedSettings
            .map((logSource) => logSource.indexPattern)
            .join(','),
          timestampField: logsSource.timestampField ?? '@timestamp',
          messageField: logsSource.messageField ?? 'message',
        };
        return {
          ...sharedSettingLogsSource,
          dataView: await getDataViewForLogSource(sharedSettingLogsSource, dataViewsService),
        };
      case 'data_view':
        const dataViewLogsSource = {
          type: 'index_name' as const,
          indexName: logsSource.dataView.getIndexPattern(),
          timestampField: logsSource.dataView.timeFieldName ?? '@timestamp',
          messageField: logsSource.messageField ?? 'message',
        };
        return {
          ...dataViewLogsSource,
          dataView: logsSource.dataView,
        };
    }
  };

// Ad-hoc Data View
const getDataViewForLogSource = async (
  logSourceConfiguration: IndexNameLogsSourceConfiguration,
  dataViewsService: DataViewsContract
) => {
  const dataView = await dataViewsService.create({
    title: logSourceConfiguration.indexName,
    timeFieldName: logSourceConfiguration.timestampField,
  });
  return dataView;
};
