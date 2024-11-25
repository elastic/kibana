/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { LogsSourceConfiguration, normalizeLogsSource } from '../../utils/logs_source';
import { LogCategories, LogCategoriesDependencies } from '../log_categories';
import { LogsOverviewErrorContent } from './logs_overview_error_content';
import { LogsOverviewLoadingContent } from './logs_overview_loading_content';

export interface LogsOverviewProps {
  dependencies: LogsOverviewDependencies;
  documentFilters?: QueryDslQueryContainer[];
  logsSource?: LogsSourceConfiguration;
  timeRange: {
    start: string;
    end: string;
  };
}

export type LogsOverviewDependencies = LogCategoriesDependencies & {
  logsDataAccess: LogsDataAccessPluginStart;
  dataViews: DataViewsContract;
};

export const LogsOverview: React.FC<LogsOverviewProps> = React.memo(
  ({
    dependencies,
    documentFilters = defaultDocumentFilters,
    logsSource = defaultLogsSource,
    timeRange,
  }) => {
    const normalizedLogsSource = useAsync(
      () =>
        normalizeLogsSource({
          logsDataAccess: dependencies.logsDataAccess,
          dataViewsService: dependencies.dataViews,
        })(logsSource),
      [dependencies.dataViews, dependencies.logsDataAccess, logsSource]
    );

    if (normalizedLogsSource.loading) {
      return <LogsOverviewLoadingContent />;
    }

    if (normalizedLogsSource.error != null || normalizedLogsSource.value == null) {
      return <LogsOverviewErrorContent error={normalizedLogsSource.error} />;
    }

    return (
      <LogCategories
        dependencies={dependencies}
        documentFilters={documentFilters}
        logsSource={normalizedLogsSource.value}
        timeRange={timeRange}
      />
    );
  }
);

const defaultDocumentFilters: QueryDslQueryContainer[] = [];

const defaultLogsSource: LogsSourceConfiguration = { type: 'shared_setting' };
