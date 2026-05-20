import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import type { StateFrom } from 'xstate';
import type { categoryDetailsService } from '../../services/category_details_service';
import type { LogCategory } from '../../types';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import type { LogCategoriesFlyoutDependencies } from '../log_category_details/log_category_details_flyout';
import type { LogCategoriesGridDependencies } from './log_categories_grid';
export interface LogCategoriesResultContentProps {
    dependencies: LogCategoriesResultContentDependencies;
    documentFilters: QueryDslQueryContainer[];
    logCategories: LogCategory[];
    logsSource: ResolvedIndexNameLogsSourceConfiguration;
    timeRange: {
        start: string;
        end: string;
    };
    categoryDetailsServiceState: StateFrom<typeof categoryDetailsService>;
    onCloseFlyout: () => void;
    onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
}
export type LogCategoriesResultContentDependencies = LogCategoriesGridDependencies & LogCategoriesFlyoutDependencies;
export declare const LogCategoriesResultContent: React.FC<LogCategoriesResultContentProps>;
export declare const LogCategoriesEmptyResultContent: React.FC;
