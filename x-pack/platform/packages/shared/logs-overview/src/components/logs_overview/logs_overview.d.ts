import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import React from 'react';
import type { LogsOverviewFeatureFlags } from '../../types';
import type { LogsSourceConfiguration } from '../../utils/logs_source';
import type { MlApiDependency } from '../../utils/ml_capabilities';
import type { LogCategoriesDependencies, LogCategoriesProps } from '../log_categories';
import type { LogEventsDependencies, LogEventsProps } from '../log_events';
export type LogsOverviewProps = Pick<LogsOverviewContentProps, 'height' | 'timeRange'> & {
    dependencies: LogsOverviewDependencies;
    documentFilters?: QueryDslQueryContainer[];
    nonHighlightingFilters?: QueryDslQueryContainer[];
    featureFlags?: LogsOverviewFeatureFlags | undefined;
    logsSource?: LogsSourceConfiguration | undefined;
};
export type LogsOverviewDependencies = LogsOverviewContentDependencies & {
    logsDataAccess: LogsDataAccessPluginStart;
    dataViews: DataViewsContract;
    mlApi: MlApiDependency;
};
export declare const LogsOverview: React.FC<LogsOverviewProps>;
export type LogsOverviewContentProps = Pick<LogCategoriesProps, 'height' | 'timeRange' | 'documentFilters' | 'nonHighlightingFilters'> & Pick<LogEventsProps, 'height' | 'timeRange' | 'documentFilters' | 'nonHighlightingFilters'> & {
    dependencies: LogsOverviewDependencies;
};
export type LogsOverviewContentDependencies = LogCategoriesDependencies & LogEventsDependencies;
export declare const LogsOverviewContent: React.NamedExoticComponent<LogsOverviewContentProps>;
