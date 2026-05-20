import React from 'react';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { LogCategory } from '../../types';
import type { LogCategoryDocumentExamplesTableDependencies } from './log_category_document_examples_table';
import { type ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import type { DiscoverLinkDependencies } from '../discover_link';
export type LogCategoriesFlyoutDependencies = LogCategoryDocumentExamplesTableDependencies & DiscoverLinkDependencies;
interface LogCategoryDetailsFlyoutProps {
    onCloseFlyout: () => void;
    logCategory: LogCategory;
    dependencies: LogCategoriesFlyoutDependencies;
    logsSource: ResolvedIndexNameLogsSourceConfiguration;
    documentFilters?: QueryDslQueryContainer[];
    timeRange: {
        start: string;
        end: string;
    };
}
export declare const LogCategoryDetailsFlyout: React.FC<LogCategoryDetailsFlyoutProps>;
export {};
