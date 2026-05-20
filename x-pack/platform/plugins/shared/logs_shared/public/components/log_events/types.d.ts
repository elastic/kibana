import { type ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export interface LogEventsDependencies {
    embeddable: EmbeddableStart;
    dataViews: DataViewsContract;
    searchSource: ISearchStartSearchSource;
}
export interface LogEventsProps {
    query?: Query;
    timeRange: TimeRange;
    index: string;
    nonHighlightingQuery?: Query;
    displayOptions?: {
        solutionNavIdOverride?: 'oblt' | 'security' | 'search';
        enableDocumentViewer?: boolean;
        enableFilters?: boolean;
    };
    executionContext?: KibanaExecutionContext;
}
