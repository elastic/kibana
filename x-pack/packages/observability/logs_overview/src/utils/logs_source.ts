/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AbstractDataView } from '@kbn/data-views-plugin/common';
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
  dataView: AbstractDataView;
  messageField?: string;
}

export const normalizeLogsSource =
  ({ logsDataAccess }: { logsDataAccess: LogsDataAccessPluginStart }) =>
  async (logsSource: LogsSourceConfiguration): Promise<IndexNameLogsSourceConfiguration> => {
    switch (logsSource.type) {
      case 'index_name':
        return logsSource;
      case 'shared_setting':
        const logSourcesFromSharedSettings =
          await logsDataAccess.services.logSourcesService.getLogSources();
        return {
          type: 'index_name',
          indexName: logSourcesFromSharedSettings
            .map((logSource) => logSource.indexPattern)
            .join(','),
          timestampField: logsSource.timestampField ?? '@timestamp',
          messageField: logsSource.messageField ?? 'message',
        };
      case 'data_view':
        return {
          type: 'index_name',
          indexName: logsSource.dataView.getIndexPattern(),
          timestampField: logsSource.dataView.timeFieldName ?? '@timestamp',
          messageField: logsSource.messageField ?? 'message',
        };
    }
  };
