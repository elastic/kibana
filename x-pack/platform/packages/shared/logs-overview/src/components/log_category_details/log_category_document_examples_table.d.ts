import React from 'react';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
export interface LogCategoryDocumentExamplesTableDependencies {
    embeddable: EmbeddableStart;
    dataViews: DataViewsContract;
    searchSource: ISearchStartSearchSource;
}
export interface LogCategoryDocumentExamplesTableProps {
    dependencies: LogCategoryDocumentExamplesTableDependencies;
    logsSource: ResolvedIndexNameLogsSourceConfiguration;
    filters: Filter[];
}
export declare const LogCategoryDocumentExamplesTable: React.FC<LogCategoryDocumentExamplesTableProps>;
