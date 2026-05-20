import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchGeneric } from '@kbn/search-types';
import type { CSSProperties } from 'react';
import React from 'react';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import type { LogCategoriesControlBarDependencies, LogCategoriesControlBarProps } from './log_categories_control_bar';
import type { LogCategoriesResultContentDependencies, LogCategoriesResultContentProps } from './log_categories_result_content';
export type LogCategoriesProps = LogCategoriesContentProps & {
    dependencies: LogCategoriesDependencies;
    documentFilters: QueryDslQueryContainer[];
    nonHighlightingFilters?: QueryDslQueryContainer[];
    logsSource: ResolvedIndexNameLogsSourceConfiguration;
    timeRange: {
        start: string;
        end: string;
    };
};
export type LogCategoriesDependencies = LogCategoriesContentDependencies & {
    search: ISearchGeneric;
};
export declare const LogCategories: React.NamedExoticComponent<LogCategoriesProps>;
export type LogCategoriesContentProps = LogCategoriesControlBarProps & Omit<LogCategoriesResultContentProps, 'categoryDetailsServiceState' | 'onCloseFlyout' | 'onOpenFlyout' | 'logCategories'> & {
    dependencies: LogCategoriesContentDependencies;
    height?: CSSProperties['height'];
};
export type LogCategoriesContentDependencies = LogCategoriesControlBarDependencies & LogCategoriesResultContentDependencies;
export declare const LogCategoriesContent: React.NamedExoticComponent<LogCategoriesContentProps>;
