import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import React from 'react';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
export interface LogEventsResultContentProps {
    dependencies: LogEventsResultContentDependencies;
    documentFilters: QueryDslQueryContainer[];
    nonHighlightingFilters?: QueryDslQueryContainer[];
    logsSource: ResolvedIndexNameLogsSourceConfiguration;
    timeRange: {
        start: string;
        end: string;
    };
}
export interface LogEventsResultContentDependencies {
    embeddable: EmbeddableStart;
    dataViews: DataViewsContract;
    searchSource: ISearchStartSearchSource;
}
export declare const LogEventsResultContent: React.NamedExoticComponent<LogEventsResultContentProps>;
