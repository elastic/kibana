/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AbstractDataView } from '@kbn/data-views-plugin/common';

export type LogsSourceConfiguration =
  | AdvancedSettingLogsSourceConfiguration
  | IndexNameLogsSourceConfiguration
  | DataViewLogsSourceConfiguration;

export interface AdvancedSettingLogsSourceConfiguration {
  type: 'advanced_setting';
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

export const normalizeLogsSource = (
  logsSource: LogsSourceConfiguration
): IndexNameLogsSourceConfiguration => {
  switch (logsSource.type) {
    case 'index_name':
      return logsSource;
    case 'advanced_setting':
      return {
        type: 'index_name',
        indexName: '', // TODO: get index name from advanced settings
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
